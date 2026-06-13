import { getFirestore } from 'firebase-admin/firestore';

export const REGULAR_SLOT_HORIZON_DAYS = 30;

export function isoDateDaysFromNow(days: number, from = new Date()): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function slotSeatsLeft(slot: Record<string, unknown>): number {
  const max = typeof slot.maxParticipants === 'number' ? slot.maxParticipants : 1;
  const count = typeof slot.participantCount === 'number' ? slot.participantCount : 0;
  return Math.max(0, max - count);
}

export async function hasOpenRegularSlotsWithinDays(
  days = REGULAR_SLOT_HORIZON_DAYS,
  fromDate?: string,
): Promise<boolean> {
  const db = getFirestore();
  const start = fromDate ?? new Date().toISOString().slice(0, 10);
  const end = isoDateDaysFromNow(days);

  const snap = await db
    .collection('availabilitySlots')
    .where('active', '==', true)
    .where('slotType', '==', 'regular')
    .get();

  return snap.docs.some((doc) => {
    const slot = doc.data();
    const date = String(slot.date ?? '');
    if (date < start || date > end) return false;
    return slotSeatsLeft(slot) > 0;
  });
}
