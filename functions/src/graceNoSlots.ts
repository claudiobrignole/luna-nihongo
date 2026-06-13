import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { issueCoupon } from './coupons';
import { queueTransactionalEmail, resolveUserLanguage } from './mail/sendTransactional';
import { hasOpenRegularSlotsWithinDays } from './slotAvailability';
import { readGraceCounters } from './schedulingCancelPolicy';
import { hasActiveSubscription } from './access';
const INCLUDED_LESSONS_PER_CYCLE = 2;

function cycleKey(user: Record<string, unknown>): string {
  return String(user.subscriptionPeriodStart ?? 'no-subscription');
}

function includedLessonsRemaining(user: Record<string, unknown>): number {
  if (!hasActiveSubscription(user)) return 0;
  const used = typeof user.includedLessonsUsed === 'number' ? user.includedLessonsUsed : 0;
  return Math.max(0, INCLUDED_LESSONS_PER_CYCLE - used);
}

export function userHasRebookCredit(user: Record<string, unknown>): boolean {
  const counters = readGraceCounters(user);
  const replacement =
    typeof user.replacementLessonCredit === 'number' ? user.replacementLessonCredit : 0;
  return (
    includedLessonsRemaining(user) > 0
    || counters.extraRebookCredit > 0
    || replacement > 0
  );
}

async function userHasFutureBooking(uid: string): Promise<boolean> {
  const db = getFirestore();
  const today = new Date().toISOString().slice(0, 10);
  const snap = await db.collection('users').doc(uid).collection('bookings').get();
  return snap.docs.some((doc) => {
    const date = String(doc.data().date ?? '');
    return date >= today;
  });
}

export async function maybeIssueGraceNoSlotsCoupon(input: {
  uid: string;
  user: Record<string, unknown>;
  resendApiKey: string;
}): Promise<{ issued: boolean; couponId?: string }> {
  const { uid, user, resendApiKey } = input;
  const key = cycleKey(user);

  if (user.graceNoSlotsCouponCycleKey === key) {
    return { issued: false };
  }

  if (!userHasRebookCredit(user)) {
    return { issued: false };
  }

  if (await userHasFutureBooking(uid)) {
    return { issued: false };
  }

  if (await hasOpenRegularSlotsWithinDays()) {
    return { issued: false };
  }

  const { couponId, code } = await issueCoupon({
    type: 'free_lesson',
    source: 'grace_no_slots',
    redeemedByUid: uid,
    note: `Auto-issued: no slots within horizon (cycle ${key})`,
  });

  await getFirestore().collection('users').doc(uid).set(
    {
      graceNoSlotsCouponCycleKey: key,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  const email = String(user.email ?? '');
  if (email) {
    queueTransactionalEmail({
      apiKey: resendApiKey,
      to: email,
      language: resolveUserLanguage(user),
      type: 'coupon_no_slots_auto',
      data: {
        name: String(user.username ?? ''),
        couponCode: code,
        bookingUrl: 'https://lunanihongo.com/?book=regular',
      },
    });
  }

  return { issued: true, couponId };
}

const resendApiKey = defineSecret('RESEND_API_KEY');

export const scanGraceNoSlotsCoupons = onSchedule(
  {
    schedule: 'every day 04:00',
    region: 'europe-west1',
    timeZone: 'Europe/Zurich',
    secrets: [resendApiKey],
  },
  async () => {
    const db = getFirestore();
    const [includedSnap, extraSnap] = await Promise.all([
      db.collection('users').where('graceCancellationsIncludedUsed', '>=', 1).get(),
      db.collection('users').where('graceCancellationsExtraUsed', '>=', 1).get(),
    ]);

    const seen = new Set<string>();
    const apiKey = resendApiKey.value();

    for (const doc of [...includedSnap.docs, ...extraSnap.docs]) {
      if (seen.has(doc.id)) continue;
      seen.add(doc.id);
      await maybeIssueGraceNoSlotsCoupon({
        uid: doc.id,
        user: doc.data(),
        resendApiKey: apiKey,
      });
    }
  },
);
