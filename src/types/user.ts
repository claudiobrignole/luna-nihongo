export type UserRole = 'super_admin' | 'admin' | 'user';
export type SubscriptionTier = 'free' | 'premium';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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
  memory: string;
  chatHistory: ChatMessage[];
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
  createdAt: string;
  updatedAt: string;
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
