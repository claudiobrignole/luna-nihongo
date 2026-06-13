/** Pure cancel / reschedule credit rules (testable without Firebase). */

export type CancellablePlan =
  | 'trial_intro'
  | 'included'
  | 'extra'
  | 'extra_rebook'
  | 'coupon'
  | 'replacement';

export interface GraceCounters {
  graceCancellationsIncludedUsed: number;
  graceCancellationsExtraUsed: number;
  extraRebookCredit: number;
  includedLessonsUsed: number;
}

export type StudentCancelOutcome = 'grace' | 'forfeit' | 'intro_restore';

export interface StudentCancelPolicyResult {
  outcome: StudentCancelOutcome;
  userUpdates: Partial<GraceCounters>;
}

function includedLikePlan(plan: CancellablePlan): boolean {
  return plan === 'included';
}

function extraLikePlan(plan: CancellablePlan): boolean {
  return plan === 'extra' || plan === 'extra_rebook';
}

export function resolveStudentCancelPolicy(
  plan: CancellablePlan,
  slotType: 'intro' | 'regular',
  state: GraceCounters,
): StudentCancelPolicyResult {
  if (slotType === 'intro') {
    return { outcome: 'intro_restore', userUpdates: {} };
  }

  if (includedLikePlan(plan)) {
    if (state.graceCancellationsIncludedUsed >= 1) {
      return { outcome: 'forfeit', userUpdates: {} };
    }
    return {
      outcome: 'grace',
      userUpdates: {
        graceCancellationsIncludedUsed: state.graceCancellationsIncludedUsed + 1,
        includedLessonsUsed: Math.max(0, state.includedLessonsUsed - 1),
      },
    };
  }

  if (extraLikePlan(plan)) {
    if (state.graceCancellationsExtraUsed >= 1) {
      return { outcome: 'forfeit', userUpdates: {} };
    }
    return {
      outcome: 'grace',
      userUpdates: {
        graceCancellationsExtraUsed: state.graceCancellationsExtraUsed + 1,
        extraRebookCredit: state.extraRebookCredit + 1,
      },
    };
  }

  // coupon / replacement — credit already consumed at booking time
  return { outcome: 'forfeit', userUpdates: {} };
}

export function resolveRescheduleReleaseUpdates(
  plan: CancellablePlan,
  state: GraceCounters,
): Partial<GraceCounters> {
  if (plan === 'included') {
    return {
      includedLessonsUsed: Math.max(0, state.includedLessonsUsed - 1),
    };
  }
  return {};
}

export function readGraceCounters(user: Record<string, unknown>): GraceCounters {
  return {
    graceCancellationsIncludedUsed:
      typeof user.graceCancellationsIncludedUsed === 'number'
        ? user.graceCancellationsIncludedUsed
        : 0,
    graceCancellationsExtraUsed:
      typeof user.graceCancellationsExtraUsed === 'number'
        ? user.graceCancellationsExtraUsed
        : 0,
    extraRebookCredit:
      typeof user.extraRebookCredit === 'number' ? user.extraRebookCredit : 0,
    includedLessonsUsed:
      typeof user.includedLessonsUsed === 'number' ? user.includedLessonsUsed : 0,
  };
}
