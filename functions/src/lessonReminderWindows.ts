/** Reminder send windows relative to lesson start (testable without Firebase). */

export const THIRTY_SIX_HOURS_MIN_MS = 35 * 60 * 60 * 1000;
export const THIRTY_SIX_HOURS_MAX_MS = 37 * 60 * 60 * 1000;
export const ONE_HOUR_MIN_MS = 55 * 60 * 1000;
export const ONE_HOUR_MAX_MS = 65 * 60 * 1000;

/** ~2 hours after booking creation */
export const TEACHER_ADD_LINK_AFTER_MS = 2 * 60 * 60 * 1000;
export const TEACHER_ADD_LINK_AFTER_MAX_MS = 3 * 60 * 60 * 1000;

/** ~48 hours before lesson if link still missing */
export const TEACHER_ADD_LINK_BEFORE_MIN_MS = 47 * 60 * 60 * 1000;
export const TEACHER_ADD_LINK_BEFORE_MAX_MS = 49 * 60 * 60 * 1000;

export const REMINDER_QUERY_MIN_MS = ONE_HOUR_MIN_MS;
export const REMINDER_QUERY_MAX_MS = THIRTY_SIX_HOURS_MAX_MS;

export function msUntilSlot(slotStartMs: number, now = Date.now()): number {
  return slotStartMs - now;
}

export function isInThirtySixHourWindow(slotStartMs: number, now = Date.now()): boolean {
  const diff = msUntilSlot(slotStartMs, now);
  return diff >= THIRTY_SIX_HOURS_MIN_MS && diff <= THIRTY_SIX_HOURS_MAX_MS;
}

export function isInOneHourWindow(slotStartMs: number, now = Date.now()): boolean {
  const diff = msUntilSlot(slotStartMs, now);
  return diff >= ONE_HOUR_MIN_MS && diff <= ONE_HOUR_MAX_MS;
}

export function reminderQueryRangeIso(now = Date.now()): { from: string; to: string } {
  return {
    from: new Date(now + REMINDER_QUERY_MIN_MS).toISOString(),
    to: new Date(now + REMINDER_QUERY_MAX_MS).toISOString(),
  };
}

export function isInTeacherAddLinkAfterBookingWindow(
  bookedAtMs: number,
  now = Date.now(),
): boolean {
  const diff = now - bookedAtMs;
  return diff >= TEACHER_ADD_LINK_AFTER_MS && diff <= TEACHER_ADD_LINK_AFTER_MAX_MS;
}

export function isInTeacherAddLinkBeforeLessonWindow(
  slotStartMs: number,
  now = Date.now(),
): boolean {
  const diff = msUntilSlot(slotStartMs, now);
  return diff >= TEACHER_ADD_LINK_BEFORE_MIN_MS && diff <= TEACHER_ADD_LINK_BEFORE_MAX_MS;
}

/** @deprecated */
export const DAY_BEFORE_MIN_MS = THIRTY_SIX_HOURS_MIN_MS;
/** @deprecated */
export const DAY_BEFORE_MAX_MS = THIRTY_SIX_HOURS_MAX_MS;
/** @deprecated */
export const TEN_MIN_MIN_MS = ONE_HOUR_MIN_MS;
/** @deprecated */
export const TEN_MIN_MAX_MS = ONE_HOUR_MAX_MS;

/** @deprecated use isInThirtySixHourWindow */
export function isInDayBeforeWindow(slotStartMs: number, now = Date.now()): boolean {
  return isInThirtySixHourWindow(slotStartMs, now);
}

/** @deprecated use isInOneHourWindow */
export function isInTenMinWindow(slotStartMs: number, now = Date.now()): boolean {
  return isInOneHourWindow(slotStartMs, now);
}
