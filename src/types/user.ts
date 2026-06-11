export type UserRole = 'super_admin' | 'admin' | 'user';
export type SubscriptionTier = 'free' | 'premium';

export const TRIAL_DAYS = 7;
export const AI_MINUTES_WEEKLY = 120;
export const AI_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_LIVE_SESSION_MINUTES = 10;
export const INCLUDED_LESSONS_PER_CYCLE = 2;
export const EXTRA_LESSON_PRICE_LABEL = '49 EUR/CHF';
export const MONTHLY_SUBSCRIPTION_LABEL = '119 EUR/CHF';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  source?: 'chat' | 'live';
  liveSessionId?: string;
  createdAt?: string;
  sessionDivider?: boolean;
}

export interface LunaUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  tier: SubscriptionTier;
  completedUnits: string[];
  xp: number;
  joinedDate: string;
  messagesCount: number;
  /** @deprecated synced from study profile for legacy server prompts */
  memory: string;
  studyGoal?: string;
  studyWeaknesses?: string;
  studyPreferences?: string;
  chatHistory: ChatMessage[];
  onboardingCompleted: boolean;
  preferredStartLevel: number;
  showRomaji: boolean;
  tutorVoiceEnabled: boolean;
  /** AI voice minutes used in the current 7-day window. */
  liveMinutesUsed: number;
  /** ISO start of the current 7-day AI window (from first session). */
  liveMinutesWindowStart?: string | null;
  /** @deprecated legacy calendar month — ignored when liveMinutesWindowStart is set */
  liveMinutesPeriod?: string;
  premiumEndedAt?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  subscriptionPeriodStart?: string | null;
  subscriptionPeriodEnd?: string | null;
  includedLessonsUsed?: number;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  trialUsed?: boolean;
  introCallBookedAt?: string | null;
  preferredLanguage?: 'it' | 'en';
  marketingConsent?: boolean;
  marketingConsentAt?: string | null;
  sendfoxSyncedAt?: string | null;
  premiumWelcomeSentAt?: string | null;
}

export interface UserProfileDocument {
  email: string;
  username: string;
  role: UserRole;
  tier: SubscriptionTier;
  completedUnits: string[];
  xp: number;
  joinedDate: string;
  messagesCount: number;
  memory: string;
  studyGoal?: string;
  studyWeaknesses?: string;
  studyPreferences?: string;
  chatHistory: ChatMessage[];
  onboardingCompleted?: boolean;
  preferredStartLevel?: number;
  showRomaji?: boolean;
  tutorVoiceEnabled?: boolean;
  liveMinutesUsed?: number;
  liveMinutesWindowStart?: string | null;
  liveMinutesPeriod?: string;
  premiumEndedAt?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  subscriptionPeriodStart?: string | null;
  subscriptionPeriodEnd?: string | null;
  includedLessonsUsed?: number;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  trialUsed?: boolean;
  introCallBookedAt?: string | null;
  preferredLanguage?: 'it' | 'en';
  marketingConsent?: boolean;
  marketingConsentAt?: string | null;
  sendfoxSyncedAt?: string | null;
  premiumWelcomeSentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function isTrialActive(
  user: Pick<LunaUser, 'trialEndsAt'>,
  now = Date.now(),
): boolean {
  if (!user.trialEndsAt) return false;
  return new Date(user.trialEndsAt).getTime() > now;
}

export function hasActiveSubscription(
  user: Pick<LunaUser, 'tier' | 'subscriptionStatus' | 'role'>,
): boolean {
  if (user.tier !== 'premium') return false;
  if (user.role === 'super_admin') return true;
  const status = user.subscriptionStatus ?? '';
  return status === 'active' || status === 'trialing';
}

export function hasPremiumAccess(
  user: Pick<LunaUser, 'tier' | 'trialEndsAt' | 'subscriptionStatus' | 'role'>,
  now = Date.now(),
): boolean {
  if (hasActiveSubscription(user)) return true;
  return isTrialActive(user, now);
}

export function canUseAiTutor(
  user: Pick<LunaUser, 'tier' | 'trialEndsAt' | 'subscriptionStatus' | 'role'>,
  now = Date.now(),
): boolean {
  return hasPremiumAccess(user, now);
}

export function trialDaysRemaining(user: Pick<LunaUser, 'trialEndsAt'>, now = Date.now()): number {
  if (!user.trialEndsAt) return 0;
  const ms = new Date(user.trialEndsAt).getTime() - now;
  return ms > 0 ? Math.ceil(ms / (24 * 60 * 60 * 1000)) : 0;
}

export function normalizeWeeklyAiUsage(
  liveMinutesUsed: number | undefined,
  liveMinutesWindowStart: string | undefined | null,
  now = Date.now(),
): { used: number; windowStart: string; reset: boolean } {
  if (!liveMinutesWindowStart) {
    return { used: 0, windowStart: new Date(now).toISOString(), reset: true };
  }
  const startMs = new Date(liveMinutesWindowStart).getTime();
  if (Number.isNaN(startMs) || now - startMs >= AI_WEEK_MS) {
    return { used: 0, windowStart: new Date(now).toISOString(), reset: true };
  }
  return { used: liveMinutesUsed ?? 0, windowStart: liveMinutesWindowStart, reset: false };
}

export function aiMinutesRemaining(user: LunaUser, now = Date.now()): number {
  if (!canUseAiTutor(user, now)) return 0;
  const { used } = normalizeWeeklyAiUsage(user.liveMinutesUsed, user.liveMinutesWindowStart, now);
  return Math.max(0, AI_MINUTES_WEEKLY - used);
}

export function includedLessonsRemaining(user: LunaUser, now = Date.now()): number {
  if (!hasActiveSubscription(user)) return 0;
  const start = user.subscriptionPeriodStart ? new Date(user.subscriptionPeriodStart).getTime() : NaN;
  const end = user.subscriptionPeriodEnd ? new Date(user.subscriptionPeriodEnd).getTime() : NaN;
  if (Number.isNaN(start) || Number.isNaN(end) || now < start || now > end) return 0;
  const used = user.includedLessonsUsed ?? 0;
  return Math.max(0, INCLUDED_LESSONS_PER_CYCLE - used);
}

/** @deprecated use aiMinutesRemaining */
export function liveMinutesRemaining(user: LunaUser): number {
  return aiMinutesRemaining(user);
}

export function liveMinutesLimitForUser(): number {
  return AI_MINUTES_WEEKLY;
}

export const SUPER_ADMIN_EMAIL = 'claudio@brignole.ch';

export function isAdminRole(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'super_admin';
}

export function canManageAdmins(role: UserRole): boolean {
  return role === 'super_admin';
}

export function isProtectedSuperAdmin(email: string): boolean {
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

export function canChangeRole(actor: LunaUser, target: LunaUser): boolean {
  if (actor.role !== 'super_admin') return false;
  if (actor.id === target.id) return false;
  if (isProtectedSuperAdmin(target.email)) return false;
  return true;
}

export function canManageTier(actor: LunaUser, target: LunaUser): boolean {
  if (actor.id === target.id) return actor.role === 'super_admin';
  if (actor.role === 'super_admin') return !isProtectedSuperAdmin(target.email) || actor.id === target.id;
  if (actor.role === 'admin') return target.role === 'user';
  return false;
}

export function canDeleteUser(actor: LunaUser, target: LunaUser): boolean {
  if (actor.role !== 'super_admin') return false;
  if (actor.id === target.id) return false;
  if (isProtectedSuperAdmin(target.email)) return false;
  return true;
}

export function assignableRoles(actor: LunaUser, target: LunaUser): UserRole[] {
  if (!canChangeRole(actor, target)) return [];
  return ['user', 'admin'];
}

export function roleLabel(role: UserRole, language: 'en' | 'it'): string {
  const labels: Record<UserRole, { en: string; it: string }> = {
    super_admin: { en: 'Super Admin', it: 'Super Admin' },
    admin: { en: 'Admin', it: 'Admin' },
    user: { en: 'Student', it: 'Studente' },
  };
  return labels[role][language];
}
