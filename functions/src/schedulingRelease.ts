import { FieldValue, getFirestore, type Transaction } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { hasActiveSubscription } from './access';
import {
  readGraceCounters,
  resolveRescheduleReleaseUpdates,
  resolveStudentCancelPolicy,
  type CancellablePlan,
  type StudentCancelOutcome,
} from './schedulingCancelPolicy';
import { isAtLeast24HoursBeforeSlot } from './schedulingRules';
import type { BookingPlan } from './schedulingTypes';

export type ReleaseMode = 'student_cancel' | 'reschedule' | 'admin';

export interface ReleaseBookingResult {
  name: string;
  email: string;
  date: string;
  time: string;
  plan: BookingPlan;
  cancelOutcome?: StudentCancelOutcome;
}

export async function releaseBookingInTransaction(
  tx: Transaction,
  uid: string,
  bookingId: string,
  booking: Record<string, unknown>,
  mode: ReleaseMode,
  options?: { skipTimeCheck?: boolean },
): Promise<ReleaseBookingResult> {
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

  if (!options?.skipTimeCheck) {
    assertCancellableAtLeast24h(slotDate, slotStart);
  }

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
  let cancelOutcome: StudentCancelOutcome | undefined;

  if (mode === 'reschedule') {
    const counters = readGraceCounters(user);
    Object.assign(userUpdates, resolveRescheduleReleaseUpdates(plan as CancellablePlan, counters));
    if (slotType === 'intro') {
      userUpdates.introCallBookedAt = null;
    }
  } else if (mode === 'student_cancel') {
    const counters = readGraceCounters(user);
    const policy = resolveStudentCancelPolicy(plan as CancellablePlan, slotType, counters);
    cancelOutcome = policy.outcome;
    Object.assign(userUpdates, policy.userUpdates);

    if (slotType === 'intro') {
      userUpdates.introCallBookedAt = null;
    }
  } else if (mode === 'admin') {
    if (slotType === 'intro') {
      userUpdates.introCallBookedAt = null;
    } else if (plan === 'included') {
      if (hasActiveSubscription(user)) {
        const used = typeof user.includedLessonsUsed === 'number' ? user.includedLessonsUsed : 0;
        userUpdates.includedLessonsUsed = Math.max(0, used - 1);
      } else {
        const replacement =
          typeof user.replacementLessonCredit === 'number' ? user.replacementLessonCredit : 0;
        userUpdates.replacementLessonCredit = replacement + 1;
      }
    } else if (plan === 'extra' || plan === 'extra_rebook') {
      const credit = typeof user.extraRebookCredit === 'number' ? user.extraRebookCredit : 0;
      userUpdates.extraRebookCredit = credit + 1;
    } else {
      const replacement =
        typeof user.replacementLessonCredit === 'number' ? user.replacementLessonCredit : 0;
      userUpdates.replacementLessonCredit = replacement + 1;
    }
  }

  tx.update(userRef, userUpdates);
  tx.delete(bookingRef);

  return {
    name: String(booking.name ?? user.username ?? ''),
    email: String(booking.email ?? user.email ?? ''),
    date: String(booking.date ?? slotDate),
    time: String(booking.time ?? ''),
    plan,
    cancelOutcome,
  };
}

function assertCancellableAtLeast24h(date: string, startTime: string): void {
  if (!isAtLeast24HoursBeforeSlot(date, startTime)) {
    throw new HttpsError(
      'failed-precondition',
      'Lessons can only be cancelled or rescheduled at least 24 hours before the session.',
    );
  }
}

export async function releaseBookingForUser(
  uid: string,
  bookingId: string,
  booking: Record<string, unknown>,
  mode: ReleaseMode,
  options?: { skipTimeCheck?: boolean },
): Promise<ReleaseBookingResult> {
  const db = getFirestore();
  return db.runTransaction(async (tx) =>
    releaseBookingInTransaction(tx, uid, bookingId, booking, mode, options),
  );
}
