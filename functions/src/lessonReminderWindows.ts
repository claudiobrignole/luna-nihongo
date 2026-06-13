/** Reminder send windows relative to lesson start (testable without Firebase). */

export const DAY_BEFORE_MIN_MS = 23 * 60 * 60 * 1000;
export const DAY_BEFORE_MAX_MS = 25 * 60 * 60 * 1000;
export const TEN_MIN_MIN_MS = 8 * 60 * 1000;
export const TEN_MIN_MAX_MS = 12 * 60 * 1000;

export const REMINDER_QUERY_MIN_MS = TEN_MIN_MIN_MS;
export const REMINDER_QUERY_MAX_MS = DAY_BEFORE_MAX_MS;

export function msUntilSlot(slotStartMs: number, now = Date.now()): number {
  return slotStartMs - now;
}

export function isInDayBeforeWindow(slotStartMs: number, now = Date.now()): boolean {
  const diff = msUntilSlot(slotStartMs, now);
  return diff >= DAY_BEFORE_MIN_MS && diff <= DAY_BEFORE_MAX_MS;
}

export function isInTenMinWindow(slotStartMs: number, now = Date.now()): boolean {
  const diff = msUntilSlot(slotStartMs, now);
  return diff >= TEN_MIN_MIN_MS && diff <= TEN_MIN_MAX_MS;
}

export function reminderQueryRangeIso(now = Date.now()): { from: string; to: string } {
  return {
    from: new Date(now + REMINDER_QUERY_MIN_MS).toISOString(),
    to: new Date(now + REMINDER_QUERY_MAX_MS).toISOString(),
  };
}
