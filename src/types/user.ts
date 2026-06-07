export type UserRole = 'super_admin' | 'admin' | 'user';
export type SubscriptionTier = 'free' | 'premium';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** chat = text tutor; live = voice session line */
  source?: 'chat' | 'live';
  liveSessionId?: string;
  createdAt?: string;
  /** Marks the start of a saved live session in unified chatHistory */
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
  /** Tutor user turns (each user message in chat). Free tier cap applies here. */
  messagesCount: number;
  memory: string;
  chatHistory: ChatMessage[];
  onboardingCompleted: boolean;
  /** Macro curriculum level (0–6) the student chose at onboarding. */
  preferredStartLevel: number;
  showRomaji: boolean;
  tutorVoiceEnabled: boolean;
  /** Live voice session minutes consumed in the current calendar month. */
  liveMinutesUsed: number;
  /** YYYY-MM period for liveMinutesUsed reset. */
  liveMinutesPeriod: string;
  /** Set when Premium ends; live history purged 90 days after this date. */
  premiumEndedAt?: string | null;
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
  chatHistory: ChatMessage[];
  onboardingCompleted?: boolean;
  preferredStartLevel?: number;
  showRomaji?: boolean;
  tutorVoiceEnabled?: boolean;
  liveMinutesUsed?: number;
  liveMinutesPeriod?: string;
  premiumEndedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const FREE_TUTOR_TURN_LIMIT = 10;

export const FREE_LIVE_MINUTES_MONTHLY = 5;
export const PREMIUM_LIVE_MINUTES_MONTHLY = 120;
export const MAX_LIVE_SESSION_MINUTES = 10;

export function currentLiveMinutesPeriod(): string {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${now.getUTCFullYear()}-${month}`;
}

export function liveMinutesLimit(tier: SubscriptionTier): number {
  return tier === 'premium' ? PREMIUM_LIVE_MINUTES_MONTHLY : FREE_LIVE_MINUTES_MONTHLY;
}

export function resolveLiveMinutesUsed(user: Pick<LunaUser, 'liveMinutesUsed' | 'liveMinutesPeriod'>): number {
  const period = currentLiveMinutesPeriod();
  if (user.liveMinutesPeriod !== period) return 0;
  return user.liveMinutesUsed ?? 0;
}

export function liveMinutesRemaining(user: LunaUser): number {
  const limit = liveMinutesLimit(user.tier);
  return Math.max(0, limit - resolveLiveMinutesUsed(user));
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
