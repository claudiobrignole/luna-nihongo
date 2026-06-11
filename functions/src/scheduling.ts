import { createHash } from 'crypto';
import { FieldValue, getFirestore, type Transaction } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { hasPremiumAccess, hasActiveSubscription } from './access';
import { queueTransactionalEmail, resolveUserLanguage } from './mail/sendTransactional';
import { isAtLeast24HoursBeforeSlot } from './schedulingRules';

const resendApiKey = defineSecret('RESEND_API_KEY');

const TRIAL_DAYS = 7;
const INCLUDED_LESSONS_PER_CYCLE = 2;
const APP_ORIGIN = 'https://lunanihongo.com';

export type BookingPlan = 'trial_intro' | 'included' | 'extra';

export interface BookingResult {
  bookingId: string;
  name: string;
  email: string;
  level: string;
  notes: string;
  date: string;
  time: string;
  plan: BookingPlan;
  slotId: string;
  slotType: 'intro' | 'regular';
  meetLink: string;
  price: string;
  timestamp: string;
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function buildVideoRoomId(slotId: string): string {
  return `luna-${slotId.replace(/[^a-zA-Z0-9]/g, '').slice(-12)}`;
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
  if (plan === 'included') return 'Inclusa';
  return '49 EUR/CHF';
}

function assertCancellableAtLeast24h(date: string, startTime: string): void {
  if (!isAtLeast24HoursBeforeSlot(date, startTime)) {
    throw new HttpsError(
      'failed-precondition',
      'Lessons can only be cancelled or rescheduled at least 24 hours before the session.',
    );
  }
}

export function notifyBookingConfirmed(
  uid: string,
  booking: Pick<BookingResult, 'email' | 'name' | 'date' | 'time' | 'meetLink' | 'price'>,
  apiKey: string,
  userData?: Record<string, unknown>,
): void {
  const language = resolveUserLanguage(userData ?? {});
  queueTransactionalEmail({
    apiKey,
    to: booking.email,
    language,
    type: 'booking_confirmed',
    data: {
      name: booking.name,
      date: booking.date,
      time: booking.time,
      meetLink: booking.meetLink,
      plan: booking.price,
    },
  });
}

export interface BookSlotInput {
  uid: string;
  slotId: string;
  name: string;
  email: string;
  level: string;
  notes: string;
  plan: BookingPlan;
}

async function bookSlotInTransaction(
  tx: Transaction,
  uid: string,
  input: BookSlotInput,
  bookingId: string,
  timestamp: string,
): Promise<BookingResult> {
  const { slotId, name, email, level, notes, plan } = input;
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
  }

  const videoRoomId = buildVideoRoomId(slotId);
  const meetLink = `${APP_ORIGIN}/call/${videoRoomId}`;
  const date = String(slot.date ?? '');
  const time = `${slot.startTime ?? ''} – ${slot.endTime ?? ''}`;
  const resolvedPlan: BookingPlan = slotType === 'intro' ? 'trial_intro' : plan;

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
    meetLink,
    price: planPriceLabel(resolvedPlan),
    timestamp,
  };

  tx.set(userRef.collection('bookings').doc(bookingId), bookingPayload);

  const userUpdates: Record<string, unknown> = { updatedAt: timestamp };

  if (slotType === 'intro') {
    userUpdates.introCallBookedAt = timestamp;
  } else if (resolvedPlan === 'included') {
    userUpdates.includedLessonsUsed = (typeof user.includedLessonsUsed === 'number' ? user.includedLessonsUsed : 0) + 1;
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

async function releaseBookingInTransaction(
  tx: Transaction,
  uid: string,
  bookingId: string,
  booking: Record<string, unknown>,
): Promise<{ name: string; email: string; date: string; time: string; plan: BookingPlan }> {
  const db = getFirestore();
  const userRef = db.collection('users').doc(uid);
  const slotId = String(booking.slotId ?? '');
  const slotRef = db.collection('availabilitySlots').doc(slotId);
  const bookingRef = userRef.collection('bookings').doc(bookingId);

  const [userSnap, slotSnap] = await Promise.all([tx.get(userRef), tx.get(slotRef)]);
  if (!userSnap.exists) {
    throw new HttpsError('not-found', 'User profile not found.');
  }
  if (!slotSnap.exists) {
    throw new HttpsError('not-found', 'Slot not found.');
  }

  const user = userSnap.data() ?? {};
  const slot = slotSnap.data() ?? {};
  const slotDate = String(slot.date ?? booking.date ?? '');
  const slotStart = String(slot.startTime ?? '');
  assertCancellableAtLeast24h(slotDate, slotStart);

  const participantIds: string[] = Array.isArray(slot.participantIds) ? slot.participantIds : [];
  const participantCount = typeof slot.participantCount === 'number'
    ? slot.participantCount
    : participantIds.length;

  tx.update(slotRef, {
    participantCount: Math.max(0, participantCount - 1),
    participantIds: FieldValue.arrayRemove(uid),
    updatedAt: new Date().toISOString(),
  });

  const plan = (booking.plan as BookingPlan) ?? 'included';
  const slotType = booking.slotType === 'intro' ? 'intro' : 'regular';
  const userUpdates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (slotType === 'intro') {
    userUpdates.introCallBookedAt = null;
  } else if (plan === 'included') {
    const used = typeof user.includedLessonsUsed === 'number' ? user.includedLessonsUsed : 0;
    userUpdates.includedLessonsUsed = Math.max(0, used - 1);
  }

  tx.update(userRef, userUpdates);
  tx.delete(bookingRef);

  return {
    name: String(booking.name ?? user.username ?? ''),
    email: String(booking.email ?? user.email ?? ''),
    date: String(booking.date ?? slotDate),
    time: String(booking.time ?? ''),
    plan,
  };
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

    const released = await db.runTransaction(async (tx) =>
      releaseBookingInTransaction(tx, uid, bookingId, booking),
    );

    queueTransactionalEmail({
      apiKey: resendApiKey.value(),
      to: released.email,
      language: resolveUserLanguage(user),
      type: 'booking_cancelled',
      data: {
        name: released.name,
        date: released.date,
        time: released.time,
        meetLink: String(booking.meetLink ?? ''),
      },
    });

    return { ok: true };
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

    if (plan === 'extra') {
      throw new HttpsError(
        'failed-precondition',
        'Extra lessons cannot be rescheduled online. Cancel this lesson and book a new slot with payment.',
      );
    }

    const timestamp = new Date().toISOString();
    const newBookingId = `book-${Date.now()}`;

    const { newBooking, released } = await db.runTransaction(async (tx) => {
      const releasedBooking = await releaseBookingInTransaction(tx, uid, bookingId, oldBooking);
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

    if (!slotId || !name || !email) {
      throw new HttpsError('invalid-argument', 'slotId, name and email are required.');
    }

    if (plan !== 'trial_intro' && plan !== 'included') {
      throw new HttpsError(
        'invalid-argument',
        'Only trial_intro or included plans can be booked directly. Extra lessons require payment.',
      );
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
    });

    notifyBookingConfirmed(uid, result, resendApiKey.value(), user);

    return result;
  },
);
