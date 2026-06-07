import { createHash } from 'crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { hasPremiumAccess, hasActiveSubscription } from './access';

const TRIAL_DAYS = 7;
const INCLUDED_LESSONS_PER_CYCLE = 2;

export type BookingPlan = 'trial_intro' | 'included' | 'extra';

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

export interface BookSlotInput {
  uid: string;
  slotId: string;
  name: string;
  email: string;
  level: string;
  notes: string;
  plan: BookingPlan;
}

export async function bookSlotForUser(input: BookSlotInput) {
  const { uid, slotId, name, email, level, notes, plan } = input;
  const db = getFirestore();
  const userRef = db.collection('users').doc(uid);
  const slotRef = db.collection('availabilitySlots').doc(slotId);

  return db.runTransaction(async (tx) => {
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

    const bookingId = `book-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const videoRoomId = buildVideoRoomId(slotId);
    const meetLink = `https://lunanihongo.it/call/${videoRoomId}`;
    const date = String(slot.date ?? '');
    const time = `${slot.startTime ?? ''} – ${slot.endTime ?? ''}`;
    const resolvedPlan: BookingPlan = slotType === 'intro' ? 'trial_intro' : plan;

    tx.update(slotRef, {
      participantCount: participantCount + 1,
      participantIds: FieldValue.arrayUnion(uid),
      updatedAt: timestamp,
    });

    const bookingPayload = {
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
  });
}

export const startFreeTrial = onCall(
  {
    region: 'europe-west1',
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

    return { trialStartedAt: now, trialEndsAt, trialDays: TRIAL_DAYS };
  },
);

export const bookAvailabilitySlot = onCall(
  {
    region: 'europe-west1',
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

    return bookSlotForUser({
      uid: request.auth.uid,
      slotId,
      name,
      email,
      level,
      notes,
      plan,
    });
  },
);
