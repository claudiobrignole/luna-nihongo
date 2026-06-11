import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANCEL_MIN_MS,
  isAtLeast24HoursBeforeSlot,
  parseSlotStartMs,
} from '../functions/lib/schedulingRules.js';

test('parseSlotStartMs parses ISO date and time', () => {
  const ms = parseSlotStartMs('2026-06-10', '14:30');
  assert.ok(ms !== null);
  assert.equal(new Date(ms).getHours(), 14);
  assert.equal(new Date(ms).getMinutes(), 30);
});

test('parseSlotStartMs returns null for empty input', () => {
  assert.equal(parseSlotStartMs('', '14:30'), null);
  assert.equal(parseSlotStartMs('2026-06-10', ''), null);
});

test('isAtLeast24HoursBeforeSlot enforces 24h window', () => {
  const slotMs = Date.parse('2026-06-10T14:30:00');
  assert.equal(isAtLeast24HoursBeforeSlot('2026-06-10', '14:30', slotMs - CANCEL_MIN_MS), true);
  assert.equal(isAtLeast24HoursBeforeSlot('2026-06-10', '14:30', slotMs - CANCEL_MIN_MS + 1), false);
});
