import { getFirestore } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

export const TEACHER_LESSON_PAYOUT_EUR = 33;

export function monthKeyFromIso(iso: string): string {
  return iso.slice(0, 7);
}

export function previousMonthKey(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function countCompletedRegularLessonsForMonth(
  teacherId: string,
  monthKey: string,
  nowMs = Date.now(),
): Promise<number> {
  const db = getFirestore();
  const snap = await db
    .collectionGroup('bookings')
    .where('teacherId', '==', teacherId)
    .where('slotType', '==', 'regular')
    .get();

  return snap.docs.filter((doc) => {
    const data = doc.data();
    const slotStartAt = String(data.slotStartAt ?? '');
    if (!slotStartAt) return false;
    const startMs = new Date(slotStartAt).getTime();
    if (Number.isNaN(startMs) || startMs >= nowMs) return false;
    return monthKeyFromIso(slotStartAt) === monthKey;
  }).length;
}

export async function listTeacherIds(): Promise<string[]> {
  const db = getFirestore();
  const ids = new Set<string>();
  for (const role of ['teacher', 'super_admin'] as const) {
    const snap = await db.collection('users').where('role', '==', role).get();
    snap.docs.forEach((doc) => ids.add(doc.id));
  }
  return [...ids];
}

/** 1st of each month: mark previous month pending_invoice when lessons were held. */
export const ensureTeacherPayoutDrafts = onSchedule(
  {
    schedule: '0 8 1 * *',
    timeZone: 'Europe/Zurich',
    region: 'europe-west1',
  },
  async () => {
    const db = getFirestore();
    const monthKey = previousMonthKey();
    const teacherIds = await listTeacherIds();

    for (const teacherId of teacherIds) {
      const lessonCount = await countCompletedRegularLessonsForMonth(teacherId, monthKey);
      if (lessonCount <= 0) continue;

      const ref = db.collection('teacherPayouts').doc(teacherId).collection('months').doc(monthKey);
      const existing = await ref.get();
      if (existing.exists && existing.data()?.status === 'paid') continue;

      await ref.set(
        {
          status: 'pending_invoice',
          lessonCount,
          amountEur: lessonCount * TEACHER_LESSON_PAYOUT_EUR,
          updatedAt: new Date().toISOString(),
          updatedBy: 'system',
        },
        { merge: true },
      );
    }
  },
);
