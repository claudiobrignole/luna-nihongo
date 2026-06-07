export const TRIAL_DAYS = 7;

export interface PremiumAccessUser {
  tier?: 'free' | 'premium';
  trialEndsAt?: string | null;
  subscriptionStatus?: string | null;
  role?: string;
}

export function isTrialActive(user: PremiumAccessUser, now = Date.now()): boolean {
  if (!user.trialEndsAt) return false;
  return new Date(user.trialEndsAt).getTime() > now;
}

export function hasActiveSubscription(user: PremiumAccessUser): boolean {
  if (user.tier !== 'premium') return false;
  if (user.role === 'super_admin') return true;
  const status = user.subscriptionStatus ?? '';
  return status === 'active' || status === 'trialing';
}

export function hasPremiumAccess(user: PremiumAccessUser, now = Date.now()): boolean {
  if (hasActiveSubscription(user)) return true;
  return isTrialActive(user, now);
}

export function canUseAiTutor(user: PremiumAccessUser, now = Date.now()): boolean {
  return hasPremiumAccess(user, now);
}
