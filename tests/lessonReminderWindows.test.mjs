import test from 'node:test';
import assert from 'node:assert/strict';
import {
  THIRTY_SIX_HOURS_MIN_MS,
  THIRTY_SIX_HOURS_MAX_MS,
  ONE_HOUR_MIN_MS,
  ONE_HOUR_MAX_MS,
  isInThirtySixHourWindow,
  isInOneHourWindow,
  isInDayBeforeWindow,
  isInTenMinWindow,
  reminderQueryRangeIso,
} from '../functions/lib/lessonReminderWindows.js';
import { resolveBookingSlotStartMs } from '../functions/lib/lessonReminders.js';

test('isInThirtySixHourWindow matches 35–37h before lesson', () => {
  const slotStart = Date.parse('2026-06-10T14:00:00Z');
  const nowInside = slotStart - 36 * 60 * 60 * 1000;
  assert.equal(isInThirtySixHourWindow(slotStart, nowInside), true);
  assert.equal(isInThirtySixHourWindow(slotStart, slotStart - THIRTY_SIX_HOURS_MIN_MS), true);
  assert.equal(isInThirtySixHourWindow(slotStart, slotStart - THIRTY_SIX_HOURS_MAX_MS), true);
  assert.equal(isInThirtySixHourWindow(slotStart, slotStart - THIRTY_SIX_HOURS_MIN_MS + 1), false);
  assert.equal(isInDayBeforeWindow(slotStart, nowInside), true);
});

test('isInOneHourWindow matches 55–65 min before lesson', () => {
  const slotStart = Date.parse('2026-06-10T14:00:00Z');
  const nowInside = slotStart - 60 * 60 * 1000;
  assert.equal(isInOneHourWindow(slotStart, nowInside), true);
  assert.equal(isInOneHourWindow(slotStart, slotStart - ONE_HOUR_MIN_MS), true);
  assert.equal(isInOneHourWindow(slotStart, slotStart - ONE_HOUR_MAX_MS), true);
  assert.equal(isInOneHourWindow(slotStart, slotStart - ONE_HOUR_MIN_MS + 1), false);
  assert.equal(isInTenMinWindow(slotStart, nowInside), true);
});

test('reminderQueryRangeIso spans one-hour through 36-hour windows', () => {
  const now = Date.parse('2026-06-09T12:00:00Z');
  const { from, to } = reminderQueryRangeIso(now);
  assert.equal(from, new Date(now + ONE_HOUR_MIN_MS).toISOString());
  assert.equal(to, new Date(now + THIRTY_SIX_HOURS_MAX_MS).toISOString());
});

test('resolveBookingSlotStartMs prefers slotStartAt then date/time', () => {
  const iso = '2026-06-10T12:30:00.000Z';
  assert.equal(
    resolveBookingSlotStartMs({ slotStartAt: iso, date: '2026-06-10', time: '14:30 – 15:30' }),
    Date.parse(iso),
  );
  const fallback = resolveBookingSlotStartMs({ date: '2026-06-10', time: '14:30 – 15:30' });
  assert.ok(fallback !== null);
});
