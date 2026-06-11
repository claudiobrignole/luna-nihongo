/** Shared booking time rules (testable without Firebase). */
export const CANCEL_MIN_MS = 24 * 60 * 60 * 1000;

export function parseSlotStartMs(date: string, startTime: string): number | null {
  if (!date || !startTime) return null;
  const parsed = new Date(`${date}T${startTime}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

export function isAtLeast24HoursBeforeSlot(
  date: string,
  startTime: string,
  now = Date.now(),
): boolean {
  const startMs = parseSlotStartMs(date, startTime);
  if (startMs === null) return false;
  return startMs - now >= CANCEL_MIN_MS;
}
