import { createHash } from 'crypto';
import { FieldValue, getFirestore, type DocumentReference, type DocumentSnapshot, type Transaction } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { hasPremiumAccess, hasActiveSubscription } from './access';
import {
  assertCouponLessonRedeemable,
  markCouponLessonUsed,
  redeemCouponForUser,
} from './coupons';
import { queueTransactionalEmail, resolveUserLanguage } from './mail/sendTransactional';
import { maybeIssueGraceNoSlotsCoupon } from './graceNoSlots';
import { parseSlotStartMs } from './schedulingRules';
import {
  releaseBookingForUser,
  releaseBookingInTransaction,
} from './schedulingRelease';
import { notifyTeacherNewBooking } from './teacherBookings';
import type { BookingPlan, BookingResult } from './schedulingTypes';

export type { BookingPlan, BookingResult } from './schedulingTypes';

const resendApiKey = defineSecret('RESEND_API_KEY');

const TRIAL_DAYS = 7;
const INCLUDED_LESSONS_PER_CYCLE = 2;
const APP_ORIGIN = 'https://lunanihongo.com';

function addDaysIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function hashClientIp(request: CallableRequest): string | null {
  const req = request.rawRequest;
  if (!req) return null;

  const forwarded = req.headers['x-forwarded-for'];
  let ip = '';
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    ip = forwarded.split(',')[0].trim();
  } else if (typeof req.socket?.remoteAddress === 'string') {
    ip = req.socket.remoteAddress;
  }
  if (!ip) return null;

  return createHash('sha256').update(`luna-trial-v1:${ip}`).digest('hex');
}

function includedLessonsRemaining(user: Record<string, unknown>, now = Date.now()): number {
  if (!hasActiveSubscription(user)) return 0;
  const start = user.subscriptionPeriodStart ? new Date(String(user.subscriptionPeriodStart)).getTime() : NaN;
  const end = user.subscriptionPeriodEnd ? new Date(String(user.subscriptionPeriodEnd)).getTime() : NaN;
  if (Number.isNaN(start) || Number.isNaN(end) || now < start || now > end) return 0;
  const used = typeof user.includedLessonsUsed === 'number' ? user.includedLessonsUsed : 0;
  return Math.max(0, INCLUDED_LESSONS_PER_CYCLE - used);
}

function planPriceLabel(plan: BookingPlan): string {
  if (plan === 'trial_intro') return 'Gratis';
  if (plan === 'included' || plan === 'replacement') return 'Inclusa';
  if (plan === 'extra_rebook') return 'Extra (riprenotazione)';
  if (plan === 'coupon') return 'Coupon';
  return '49 EUR/CHF';
}

function buildSlotStartAt(date: string, startTime: string): string | null {
  const startMs = parseSlotStartMs(date, String(startTime).split('–')[0]?.trim() ?? startTime);
  return startMs ? new Date(startMs).toISOString() : null;
}

function resolveTeacherFromSlot(
  slot: Record<string, unknown>,
  teacherSnap: DocumentSnapshot | null,
): { teacherId: string; teacherDisplayName: string; teacherEmail: string } {
  const teacherId = String(slot.teacherId ?? '');
  if (!teacherId) {
    throw new HttpsError('failed-precondition', 'Slot has no teacher assigned.');
  }
  const teacher = teacherSnap?.data() ?? {};
  const teacherDisplayName = String(
    slot.teacherDisplayName ?? teacher.teacherDisplayName ?? teacher.username ?? 'Maestro/a',
  );
  const teacherEmail = String(teacher.email ?? '');
  if (!teacherEmail) {
    throw new HttpsError('failed-precondition', 'Teacher profile has no email.');
  }
  return { teacherId, teacherDisplayName, teacherEmail };
}

export function notifyBookingParties(
  uid: string,
  booking: BookingResult,
  apiKey: string,
  userData?: Record<string, unknown>,
  teacherData?: Record<string, unknown>,
): void {
  const language = resolveUserLanguage(userData ?? {});
  queueTransactionalEmail({
    apiKey,
    to: booking.email,
    language,
    type: 'booking_confirmed',
    data: {
      name: booking.name,
      teacherName: booking.teacherDisplayName,
      date: booking.date,
      time: booking.time,
      meetLink: booking.meetLink ?? '',
      plan: booking.price,
    },
  });

  notifyTeacherNewBooking(apiKey, booking.teacherEmail, teacherData ?? {}, {
    teacherName: booking.teacherDisplayName,
    studentName: booking.name,
    studentEmail: booking.email,
    date: booking.date,
    time: booking.time,
    plan: booking.price,
  });
}

/** @deprecated use notifyBookingParties */
export function notifyBookingConfirmed(
  uid: string,
  booking: Pick<BookingResult, 'email' | 'name' | 'date' | 'time' | 'meetLink' | 'price' | 'teacherDisplayName' | 'teacherEmail'>,
  apiKey: string,
  userData?: Record<string, unknown>,
): void {
  notifyBookingParties(
    uid,
    booking as BookingResult,
    apiKey,
    userData,
    {},
  );
}

export interface BookSlotInput {
  uid: string;
  slotId: string;
  name: string;
  email: string;
  level: string;
  notes: string;
  plan: BookingPlan;
  couponId?: string;
}

async function bookSlotInTransaction(
  tx: Transaction,
  uid: string,
  input: BookSlotInput,
  bookingId: string,
  timestamp: string,
): Promise<BookingResult> {
  const { slotId, name, email, level, notes, plan, couponId } = input;
  const db = getFirestore();
  const userRef = db.collection('users').doc(uid);
  const slotRef = db.collection('availabilitySlots').doc(slotId);

  const [userSnap, slotSnap] = await Promise.all([tx.get(userRef), tx.get(slotRef)]);

  if (!userSnap.exists) {
    throw new HttpsError('not-found', 'User profile not found.');
  }
  if (!slotSnap.exists) {
    throw new HttpsError('not-found', 'Slot not found.');
  }

  const user = userSnap.data() ?? {};
  const slot = slotSnap.data() ?? {};
  const teacherIdOnSlot = String(slot.teacherId ?? '');
  const teacherSnap = teacherIdOnSlot
    ? await tx.get(db.collection('users').doc(teacherIdOnSlot))
    : null;
  const teacherInfo = resolveTeacherFromSlot(slot, teacherSnap);

  if (slot.active === false) {
    throw new HttpsError('failed-precondition', 'Slot is not available.');
  }

  const slotType = slot.slotType === 'intro' ? 'intro' : 'regular';
  const maxParticipants = typeof slot.maxParticipants === 'number' ? slot.maxParticipants : 1;
  const participantIds: string[] = Array.isArray(slot.participantIds) ? slot.participantIds : [];
  const participantCount = typeof slot.participantCount === 'number'
    ? slot.participantCount
    : participantIds.length;

  if (participantIds.includes(uid)) {
    throw new HttpsError('already-exists', 'Already booked on this slot.');
  }
  if (participantCount >= maxParticipants) {
    throw new HttpsError('resource-exhausted', 'Slot is full.');
  }

  if (slotType === 'intro') {
    if (!hasPremiumAccess(user) && user.trialUsed !== true) {
      throw new HttpsError('permission-denied', 'Start the free trial before booking the intro call.');
    }
    if (user.introCallBookedAt) {
      throw new HttpsError('already-exists', 'Intro call already booked.');
    }
    if (plan !== 'trial_intro') {
      throw new HttpsError('invalid-argument', 'Intro slots require plan trial_intro.');
    }
  } else {
    if (plan === 'trial_intro') {
      throw new HttpsError('invalid-argument', 'Intro plan cannot be used on regular slots.');
    }
    if (plan === 'included') {
      if (!hasActiveSubscription(user)) {
        throw new HttpsError('permission-denied', 'Active subscription required.');
      }
      if (includedLessonsRemaining(user) <= 0) {
        throw new HttpsError('resource-exhausted', 'No included lessons left this billing cycle.');
      }
    }
    if (plan === 'extra') {
      if (!hasActiveSubscription(user)) {
        throw new HttpsError('permission-denied', 'Active subscription required for extra lessons.');
      }
    }
    if (plan === 'extra_rebook') {
      const credit = typeof user.extraRebookCredit === 'number' ? user.extraRebookCredit : 0;
      if (credit <= 0) {
        throw new HttpsError(
          'failed-precondition',
          'No extra lesson rebook credit available.',
        );
      }
    }
    if (plan === 'coupon') {
      if (!couponId) {
        throw new HttpsError('invalid-argument', 'couponId is required for coupon bookings.');
      }
    }
    if (plan === 'replacement') {
      const replacementCredit =
        typeof user.replacementLessonCredit === 'number' ? user.replacementLessonCredit : 0;
      if (replacementCredit <= 0) {
        throw new HttpsError(
          'failed-precondition',
          'No replacement lesson credit available.',
        );
      }
    }
  }

  const date = String(slot.date ?? '');
  const slotStartTime = String(slot.startTime ?? '');
  const time = `${slotStartTime} – ${slot.endTime ?? ''}`;
  const resolvedPlan: BookingPlan = slotType === 'intro' ? 'trial_intro' : plan;
  const slotStartAt = buildSlotStartAt(date, slotStartTime);

  let couponRefToUse: DocumentReference | null = null;
  if (plan === 'coupon' && couponId) {
    const checked = await assertCouponLessonRedeemable(tx, couponId, uid);
    couponRefToUse = checked.couponRef;
  }

  tx.update(slotRef, {
    participantCount: participantCount + 1,
    participantIds: FieldValue.arrayUnion(uid),
    updatedAt: timestamp,
  });

  const bookingPayload: Omit<BookingResult, 'bookingId'> = {
    name,
    email,
    level,
    notes,
    date,
    time,
    plan: resolvedPlan,
    slotId,
    slotType,
    teacherId: teacherInfo.teacherId,
    teacherDisplayName: teacherInfo.teacherDisplayName,
    teacherEmail: teacherInfo.teacherEmail,
    meetLink: null,
    price: planPriceLabel(resolvedPlan),
    timestamp,
    slotStartAt,
    couponId: plan === 'coupon' ? couponId ?? null : null,
    studentUid: uid,
  };

  tx.set(userRef.collection('bookings').doc(bookingId), bookingPayload);

  const userUpdates: Record<string, unknown> = { updatedAt: timestamp };

  if (slotType === 'intro') {
    userUpdates.introCallBookedAt = timestamp;
  } else if (resolvedPlan === 'included') {
    userUpdates.includedLessonsUsed =
      (typeof user.includedLessonsUsed === 'number' ? user.includedLessonsUsed : 0) + 1;
  } else if (resolvedPlan === 'extra_rebook') {
    const credit = typeof user.extraRebookCredit === 'number' ? user.extraRebookCredit : 0;
    userUpdates.extraRebookCredit = Math.max(0, credit - 1);
  } else if (resolvedPlan === 'replacement') {
    const credit =
      typeof user.replacementLessonCredit === 'number' ? user.replacementLessonCredit : 0;
    userUpdates.replacementLessonCredit = Math.max(0, credit - 1);
  }

  if (resolvedPlan === 'coupon' && couponRefToUse) {
    markCouponLessonUsed(tx, couponRefToUse);
  }

  tx.update(userRef, userUpdates);

  return {
    bookingId,
    ...bookingPayload,
  };
}

export async function bookSlotForUser(input: BookSlotInput): Promise<BookingResult> {
  const { uid } = input;
  const db = getFirestore();
  const bookingId = `book-${Date.now()}`;
  const timestamp = new Date().toISOString();

  return db.runTransaction(async (tx) =>
    bookSlotInTransaction(tx, uid, input, bookingId, timestamp),
  );
}

function notifyTeacherCancelled(
  apiKey: string,
  booking: Record<string, unknown>,
  teacherData: Record<string, unknown>,
  emailType: 'booking_cancelled_grace' | 'booking_cancelled_forfeit',
  date: string,
  time: string,
): void {
  const teacherEmail = String(booking.teacherEmail ?? '').trim();
  if (!teacherEmail) return;
  queueTransactionalEmail({
    apiKey,
    to: teacherEmail,
    language: resolveUserLanguage(teacherData),
    type: emailType,
    data: {
      name: String(booking.teacherDisplayName ?? teacherData.username ?? ''),
      teacherName: String(booking.teacherDisplayName ?? ''),
      date,
      time,
      meetLink: String(booking.meetLink ?? ''),
    },
  });
}

export const cancelBooking = onCall(
  {
    region: 'europe-west1',
    secrets: [resendApiKey],
    invoker: 'public',
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Login required.');
    }

    const uid = request.auth.uid;
    const bookingId = typeof request.data?.bookingId === 'string' ? request.data.bookingId.trim() : '';
    if (!bookingId) {
      throw new HttpsError('invalid-argument', 'bookingId is required.');
    }

    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const bookingRef = userRef.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      throw new HttpsError('not-found', 'Booking not found.');
    }

    const booking = bookingSnap.data() ?? {};
    const userSnap = await userRef.get();
    const user = userSnap.data() ?? {};

    const released = await releaseBookingForUser(uid, bookingId, booking, 'student_cancel');

    if (released.cancelOutcome === 'grace' && booking.slotType !== 'intro') {
      const freshUser = (await userRef.get()).data() ?? user;
      await maybeIssueGraceNoSlotsCoupon({
        uid,
        user: freshUser,
        resendApiKey: resendApiKey.value(),
      });
    }

    const emailType =
      released.cancelOutcome === 'forfeit'
        ? 'booking_cancelled_forfeit'
        : 'booking_cancelled_grace';

    queueTransactionalEmail({
      apiKey: resendApiKey.value(),
      to: released.email,
      language: resolveUserLanguage(user),
      type: emailType,
      data: {
        name: released.name,
        date: released.date,
        time: released.time,
        meetLink: String(booking.meetLink ?? ''),
        plan: released.plan,
      },
    });

    const teacherId = String(booking.teacherId ?? '');
    if (teacherId) {
      const teacherSnap = await db.collection('users').doc(teacherId).get();
      notifyTeacherCancelled(
        resendApiKey.value(),
        booking,
        teacherSnap.data() ?? {},
        emailType,
        released.date,
        released.time,
      );
    }

    return { ok: true, outcome: released.cancelOutcome ?? 'grace' };
  },
);

export const rescheduleBooking = onCall(
  {
    region: 'europe-west1',
    secrets: [resendApiKey],
    invoker: 'public',
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Login required.');
    }

    const uid = request.auth.uid;
    const bookingId = typeof request.data?.bookingId === 'string' ? request.data.bookingId.trim() : '';
    const newSlotId = typeof request.data?.newSlotId === 'string' ? request.data.newSlotId.trim() : '';

    if (!bookingId || !newSlotId) {
      throw new HttpsError('invalid-argument', 'bookingId and newSlotId are required.');
    }

    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const bookingRef = userRef.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      throw new HttpsError('not-found', 'Booking not found.');
    }

    const oldBooking = bookingSnap.data() ?? {};
    const userSnap = await userRef.get();
    const user = userSnap.data() ?? {};

    const oldDate = String(oldBooking.date ?? '');
    const oldTime = String(oldBooking.time ?? '');
    const plan = (oldBooking.plan as BookingPlan) ?? 'included';

    if (plan === 'extra' || plan === 'extra_rebook') {
      throw new HttpsError(
        'failed-precondition',
        'Extra lessons cannot be rescheduled online. Cancel this lesson and book a new slot with payment.',
      );
    }

    if (plan === 'coupon' || plan === 'replacement') {
      throw new HttpsError(
        'failed-precondition',
        'Coupon and replacement lessons cannot be rescheduled online. Cancel and book again.',
      );
    }

    const timestamp = new Date().toISOString();
    const newBookingId = `book-${Date.now()}`;

    const { newBooking, released } = await db.runTransaction(async (tx) => {
      const releasedBooking = await releaseBookingInTransaction(
        tx,
        uid,
        bookingId,
        oldBooking,
        'reschedule',
      );
      const booked = await bookSlotInTransaction(
        tx,
        uid,
        {
          uid,
          slotId: newSlotId,
          name: String(oldBooking.name ?? user.username ?? ''),
          email: String(oldBooking.email ?? user.email ?? ''),
          level: String(oldBooking.level ?? 'beginner'),
          notes: String(oldBooking.notes ?? ''),
          plan,
        },
        newBookingId,
        timestamp,
      );
      return { newBooking: booked, released: releasedBooking };
    });

    queueTransactionalEmail({
      apiKey: resendApiKey.value(),
      to: newBooking.email,
      language: resolveUserLanguage(user),
      type: 'booking_rescheduled',
      data: {
        name: newBooking.name,
        oldDate: released.date || oldDate,
        oldTime: released.time || oldTime,
        date: newBooking.date,
        time: newBooking.time,
        meetLink: newBooking.meetLink,
      },
    });

    return newBooking;
  },
);

export const startFreeTrial = onCall(
  {
    region: 'europe-west1',
    secrets: [resendApiKey],
    invoker: 'public',
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Login required.');
    }

    const uid = request.auth.uid;
    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      throw new HttpsError('not-found', 'User profile not found.');
    }

    const user = snap.data() ?? {};

    if (user.trialUsed === true) {
      throw new HttpsError('already-exists', 'Free trial already used.');
    }

    if (user.tier === 'premium' && hasActiveSubscription(user)) {
      throw new HttpsError('failed-precondition', 'You already have Premium.');
    }

    const ipHash = hashClientIp(request);
    if (ipHash) {
      const claimRef = db.collection('trialIpClaims').doc(ipHash);
      const claimSnap = await claimRef.get();
      if (claimSnap.exists) {
        const claimUid = claimSnap.data()?.uid as string | undefined;
        if (claimUid && claimUid !== uid) {
          throw new HttpsError(
            'failed-precondition',
            'A free trial was already started from this network. Contact support if this is an error.',
          );
        }
      }
    }

    const now = new Date().toISOString();
    const trialEndsAt = addDaysIso(TRIAL_DAYS);

    await userRef.set(
      {
        trialUsed: true,
        trialStartedAt: now,
        trialEndsAt,
        updatedAt: now,
      },
      { merge: true },
    );

    if (ipHash) {
      await db.collection('trialIpClaims').doc(ipHash).set(
        {
          uid,
          claimedAt: now,
        },
        { merge: true },
      );
    }

    const email = String(user.email ?? request.auth.token.email ?? '');
    if (email) {
      const endsLabel = new Date(trialEndsAt).toLocaleDateString(
        user.preferredLanguage === 'en' ? 'en-US' : 'it-IT',
        { day: 'numeric', month: 'long', year: 'numeric' },
      );
      queueTransactionalEmail({
        apiKey: resendApiKey.value(),
        to: email,
        language: resolveUserLanguage(user),
        type: 'trial_started',
        data: {
          name: String(user.username ?? ''),
          trialDays: TRIAL_DAYS,
          trialEndsAt: endsLabel,
          bookingUrl: `${APP_ORIGIN}/?book=intro`,
        },
      });
    }

    return { trialStartedAt: now, trialEndsAt, trialDays: TRIAL_DAYS };
  },
);

export const bookAvailabilitySlot = onCall(
  {
    region: 'europe-west1',
    secrets: [resendApiKey],
    invoker: 'public',
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Login required.');
    }

    const slotId = typeof request.data?.slotId === 'string' ? request.data.slotId.trim() : '';
    const name = typeof request.data?.name === 'string' ? request.data.name.trim() : '';
    const email = typeof request.data?.email === 'string' ? request.data.email.trim() : '';
    const level = typeof request.data?.level === 'string' ? request.data.level : 'beginner';
    const notes = typeof request.data?.notes === 'string' ? request.data.notes.trim() : '';
    const plan = request.data?.plan;
    const couponId =
      typeof request.data?.couponId === 'string' ? request.data.couponId.trim() : undefined;

    if (!slotId || !name || !email) {
      throw new HttpsError('invalid-argument', 'slotId, name and email are required.');
    }

    const allowedPlans = ['trial_intro', 'included', 'extra_rebook', 'coupon', 'replacement'] as const;
    if (!allowedPlans.includes(plan)) {
      throw new HttpsError(
        'invalid-argument',
        'Only trial_intro, included, extra_rebook, or coupon plans can be booked directly. Extra lessons require payment.',
      );
    }

    if (plan === 'coupon' && !couponId) {
      throw new HttpsError('invalid-argument', 'couponId is required for coupon bookings.');
    }

    const uid = request.auth.uid;
    const userSnap = await getFirestore().collection('users').doc(uid).get();
    const user = userSnap.data() ?? {};

    const result = await bookSlotForUser({
      uid,
      slotId,
      name,
      email,
      level,
      notes,
      plan,
      couponId,
    });

    const teacherSnap = await getFirestore().collection('users').doc(result.teacherId).get();
    notifyBookingParties(uid, result, resendApiKey.value(), user, teacherSnap.data() ?? {});

    return result;
  },
);

export const redeemCoupon = onCall(
  {
    region: 'europe-west1',
    invoker: 'public',
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Login required.');
    }

    const code = typeof request.data?.code === 'string' ? request.data.code.trim() : '';
    if (!code) {
      throw new HttpsError('invalid-argument', 'code is required.');
    }

    return redeemCouponForUser(request.auth.uid, code);
  },
);

export const checkGraceNoSlotsCoupon = onCall(
  {
    region: 'europe-west1',
    secrets: [resendApiKey],
    invoker: 'public',
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Login required.');
    }

    const uid = request.auth.uid;
    const userSnap = await getFirestore().collection('users').doc(uid).get();
    if (!userSnap.exists) {
      throw new HttpsError('not-found', 'User profile not found.');
    }

    return maybeIssueGraceNoSlotsCoupon({
      uid,
      user: userSnap.data() ?? {},
      resendApiKey: resendApiKey.value(),
    });
  },
);
