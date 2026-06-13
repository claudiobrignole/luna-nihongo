import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY_BEFORE_MIN_MS,
  DAY_BEFORE_MAX_MS,
  TEN_MIN_MIN_MS,
  TEN_MIN_MAX_MS,
  isInDayBeforeWindow,
  isInTenMinWindow,
  reminderQueryRangeIso,
} from '../functions/lib/lessonReminderWindows.js';
import { resolveBookingSlotStartMs } from '../functions/lib/lessonReminders.js';

test('isInDayBeforeWindow matches 23–25h before lesson', () => {
  const slotStart = Date.parse('2026-06-10T14:00:00Z');
  const nowInside = slotStart - 24 * 60 * 60 * 1000;
  assert.equal(isInDayBeforeWindow(slotStart, nowInside), true);
  assert.equal(isInDayBeforeWindow(slotStart, slotStart - DAY_BEFORE_MIN_MS), true);
  assert.equal(isInDayBeforeWindow(slotStart, slotStart - DAY_BEFORE_MAX_MS), true);
  assert.equal(isInDayBeforeWindow(slotStart, slotStart - DAY_BEFORE_MIN_MS + 1), false);
  assert.equal(isInDayBeforeWindow(slotStart, slotStart - DAY_BEFORE_MAX_MS - 1), false);
});

test('isInTenMinWindow matches 8–12 min before lesson', () => {
  const slotStart = Date.parse('2026-06-10T14:00:00Z');
  const nowInside = slotStart - 10 * 60 * 1000;
  assert.equal(isInTenMinWindow(slotStart, nowInside), true);
  assert.equal(isInTenMinWindow(slotStart, slotStart - TEN_MIN_MIN_MS), true);
  assert.equal(isInTenMinWindow(slotStart, slotStart - TEN_MIN_MAX_MS), true);
  assert.equal(isInTenMinWindow(slotStart, slotStart - TEN_MIN_MIN_MS + 1), false);
  assert.equal(isInTenMinWindow(slotStart, slotStart - TEN_MIN_MAX_MS - 1), false);
});

test('reminderQueryRangeIso spans ten-min through day-before windows', () => {
  const now = Date.parse('2026-06-09T12:00:00Z');
  const { from, to } = reminderQueryRangeIso(now);
  assert.equal(from, new Date(now + TEN_MIN_MIN_MS).toISOString());
  assert.equal(to, new Date(now + DAY_BEFORE_MAX_MS).toISOString());
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
