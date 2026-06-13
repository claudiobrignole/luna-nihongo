import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveStudentCancelPolicy,
  resolveRescheduleReleaseUpdates,
} from '../functions/lib/schedulingCancelPolicy.js';

test('first included cancel is grace and restores credit', () => {
  const result = resolveStudentCancelPolicy('included', 'regular', {
    graceCancellationsIncludedUsed: 0,
    graceCancellationsExtraUsed: 0,
    extraRebookCredit: 0,
    includedLessonsUsed: 2,
  });

  assert.equal(result.outcome, 'grace');
  assert.equal(result.userUpdates.graceCancellationsIncludedUsed, 1);
  assert.equal(result.userUpdates.includedLessonsUsed, 1);
});

test('second included cancel in cycle is forfeit', () => {
  const result = resolveStudentCancelPolicy('included', 'regular', {
    graceCancellationsIncludedUsed: 1,
    graceCancellationsExtraUsed: 0,
    extraRebookCredit: 0,
    includedLessonsUsed: 2,
  });

  assert.equal(result.outcome, 'forfeit');
  assert.deepEqual(result.userUpdates, {});
});

test('first extra cancel grants rebook credit', () => {
  const result = resolveStudentCancelPolicy('extra', 'regular', {
    graceCancellationsIncludedUsed: 0,
    graceCancellationsExtraUsed: 0,
    extraRebookCredit: 0,
    includedLessonsUsed: 0,
  });

  assert.equal(result.outcome, 'grace');
  assert.equal(result.userUpdates.graceCancellationsExtraUsed, 1);
  assert.equal(result.userUpdates.extraRebookCredit, 1);
});

test('second extra cancel is forfeit', () => {
  const result = resolveStudentCancelPolicy('extra_rebook', 'regular', {
    graceCancellationsIncludedUsed: 0,
    graceCancellationsExtraUsed: 1,
    extraRebookCredit: 0,
    includedLessonsUsed: 0,
  });

  assert.equal(result.outcome, 'forfeit');
});

test('reschedule included restores one included credit temporarily', () => {
  const updates = resolveRescheduleReleaseUpdates('included', {
    graceCancellationsIncludedUsed: 0,
    graceCancellationsExtraUsed: 0,
    extraRebookCredit: 0,
    includedLessonsUsed: 2,
  });

  assert.equal(updates.includedLessonsUsed, 1);
});
