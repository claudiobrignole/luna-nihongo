import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';
import type {
  ChatMessage,
  LunaUser,
  SubscriptionTier,
  UserProfileDocument,
  UserRole,
} from '../types/user';
import {
  SUPER_ADMIN_EMAIL,
  canChangeRole,
  canManageTier,
} from '../types/user';

const USERS_COLLECTION = 'users';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function resolveRoleForEmail(email: string): UserRole {
  return normalizeEmail(email) === normalizeEmail(SUPER_ADMIN_EMAIL)
    ? 'super_admin'
    : 'user';
}

export function resolveTierForEmail(email: string): SubscriptionTier {
  return normalizeEmail(email) === normalizeEmail(SUPER_ADMIN_EMAIL)
    ? 'premium'
    : 'free';
}

function defaultMemory(): string {
  return '';
}

function normalizeSuperAdminPremiumFields(data: DocumentData): DocumentData {
  const email = normalizeEmail(String(data.email ?? ''));
  if (email !== normalizeEmail(SUPER_ADMIN_EMAIL) || data.tier !== 'premium') {
    return data;
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setUTCDate(periodEnd.getUTCDate() + 30);

  return {
    ...data,
    role: data.role ?? 'super_admin',
    subscriptionStatus: data.subscriptionStatus ?? 'active',
    subscriptionPeriodStart: data.subscriptionPeriodStart ?? now.toISOString(),
    subscriptionPeriodEnd: data.subscriptionPeriodEnd ?? periodEnd.toISOString(),
    includedLessonsUsed: typeof data.includedLessonsUsed === 'number' ? data.includedLessonsUsed : 0,
    liveMinutesWindowStart: data.liveMinutesWindowStart ?? null,
  };
}

function docToUser(uid: string, data: DocumentData): LunaUser {
  const normalized = normalizeSuperAdminPremiumFields(data);
  return {
    id: uid,
    email: normalized.email ?? '',
    username: normalized.username ?? '',
    role: normalized.role ?? 'user',
    tier: normalized.tier ?? 'free',
    completedUnits: normalized.completedUnits ?? [],
    xp: normalized.xp ?? 0,
    joinedDate: normalized.joinedDate ?? '',
    messagesCount: normalized.messagesCount ?? 0,
    memory: normalized.memory ?? '',
    studyGoal: normalized.studyGoal ?? undefined,
    studyWeaknesses: normalized.studyWeaknesses ?? undefined,
    studyPreferences: normalized.studyPreferences ?? undefined,
    chatHistory: normalized.chatHistory ?? [],
    onboardingCompleted:
      normalized.onboardingCompleted === true
        ? true
        : normalized.onboardingCompleted === false
          ? false
          : (normalized.completedUnits?.length ?? 0) > 0,
    preferredStartLevel: typeof normalized.preferredStartLevel === 'number' ? normalized.preferredStartLevel : 0,
    showRomaji: normalized.showRomaji !== false,
    tutorVoiceEnabled: normalized.tutorVoiceEnabled !== false,
    liveMinutesUsed: normalized.liveMinutesUsed ?? 0,
    liveMinutesWindowStart: normalized.liveMinutesWindowStart ?? null,
    liveMinutesPeriod: normalized.liveMinutesPeriod ?? '',
    premiumEndedAt: normalized.premiumEndedAt ?? null,
    stripeCustomerId: normalized.stripeCustomerId ?? null,
    stripeSubscriptionId: normalized.stripeSubscriptionId ?? null,
    subscriptionStatus: normalized.subscriptionStatus ?? null,
    subscriptionPeriodStart: normalized.subscriptionPeriodStart ?? null,
    subscriptionPeriodEnd: normalized.subscriptionPeriodEnd ?? null,
    includedLessonsUsed: typeof normalized.includedLessonsUsed === 'number' ? normalized.includedLessonsUsed : 0,
    graceCancellationsIncludedUsed:
      typeof normalized.graceCancellationsIncludedUsed === 'number'
        ? normalized.graceCancellationsIncludedUsed
        : 0,
    graceCancellationsExtraUsed:
      typeof normalized.graceCancellationsExtraUsed === 'number'
        ? normalized.graceCancellationsExtraUsed
        : 0,
    extraRebookCredit:
      typeof normalized.extraRebookCredit === 'number' ? normalized.extraRebookCredit : 0,
    replacementLessonCredit:
      typeof normalized.replacementLessonCredit === 'number'
        ? normalized.replacementLessonCredit
        : 0,
    trialStartedAt: normalized.trialStartedAt ?? null,
    trialEndsAt: normalized.trialEndsAt ?? null,
    trialUsed: normalized.trialUsed === true,
    introCallBookedAt: normalized.introCallBookedAt ?? null,
    preferredLanguage: normalized.preferredLanguage === 'en' ? 'en' : 'it',
    marketingConsent: normalized.marketingConsent === true,
    marketingConsentAt: normalized.marketingConsentAt ?? null,
    sendfoxSyncedAt: normalized.sendfoxSyncedAt ?? null,
    premiumWelcomeSentAt: normalized.premiumWelcomeSentAt ?? null,
  };
}

export async function getUserProfile(uid: string): Promise<LunaUser | null> {
  const snap = await getDoc(doc(getFirebaseDb(), USERS_COLLECTION, uid));
  if (!snap.exists()) return null;
  return docToUser(uid, snap.data());
}

export async function ensureUserProfile(
  uid: string,
  email: string,
  username: string,
  language: 'en' | 'it' = 'it',
  options?: { marketingConsent?: boolean },
): Promise<LunaUser> {
  const ref = doc(getFirebaseDb(), USERS_COLLECTION, uid);
  const snap = await getDoc(ref);
  const now = new Date().toISOString();
  const normalizedEmail = normalizeEmail(email);
  const expectedRole = resolveRoleForEmail(normalizedEmail);

  if (snap.exists()) {
    const existing = docToUser(uid, snap.data());
    // Always enforce super admin role for the designated account
    if (expectedRole === 'super_admin' && existing.role !== 'super_admin') {
      await updateDoc(ref, {
        role: 'super_admin',
        tier: 'premium',
        updatedAt: now,
      });
      return { ...existing, role: 'super_admin', tier: 'premium' };
    }
    return existing;
  }

  const role = expectedRole;
  const tier = resolveTierForEmail(normalizedEmail);
  const profile: UserProfileDocument = {
    email: normalizedEmail,
    username: username.trim() || normalizedEmail.split('@')[0],
    role,
    tier,
    completedUnits: [],
    xp: 0,
    joinedDate: new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'it-IT'),
    messagesCount: 0,
    memory: defaultMemory(),
    chatHistory: [],
    onboardingCompleted: false,
    preferredStartLevel: 0,
    preferredLanguage: language,
    showRomaji: true,
    tutorVoiceEnabled: true,
    liveMinutesUsed: 0,
    liveMinutesPeriod: '',
    marketingConsent: options?.marketingConsent === true,
    marketingConsentAt: options?.marketingConsent === true ? now : null,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(ref, profile);
  return docToUser(uid, profile);
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<
    Pick<
      LunaUser,
      | 'username'
      | 'tier'
      | 'role'
      | 'completedUnits'
      | 'xp'
      | 'messagesCount'
      | 'memory'
      | 'studyGoal'
      | 'studyWeaknesses'
      | 'studyPreferences'
      | 'chatHistory'
      | 'onboardingCompleted'
      | 'preferredStartLevel'
      | 'preferredLanguage'
      | 'marketingConsent'
      | 'marketingConsentAt'
      | 'showRomaji'
      | 'tutorVoiceEnabled'
      | 'liveMinutesUsed'
      | 'liveMinutesPeriod'
      | 'premiumEndedAt'
    >
  >
): Promise<LunaUser> {
  const ref = doc(getFirebaseDb(), USERS_COLLECTION, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Profilo utente non trovato.');
  }

  const current = docToUser(uid, snap.data());
  const normalizedEmail = normalizeEmail(current.email);

  // Protect super admin role from being changed by non-super-admin flows
  if (
    updates.role !== undefined &&
    normalizeEmail(normalizedEmail) === normalizeEmail(SUPER_ADMIN_EMAIL) &&
    updates.role !== 'super_admin'
  ) {
    throw new Error('Il ruolo super admin non può essere modificato.');
  }

  const payload: Record<string, unknown> = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (updates.tier !== undefined && updates.tier !== current.tier) {
    if (updates.tier === 'free' && current.tier === 'premium') {
      payload.premiumEndedAt = new Date().toISOString();
    }
    if (updates.tier === 'premium') {
      payload.premiumEndedAt = null;
    }
  }

  await updateDoc(ref, payload);
  const updated = await getDoc(ref);
  return docToUser(uid, updated.data()!);
}

export async function setUserRole(
  actor: LunaUser,
  targetUid: string,
  newRole: UserRole
): Promise<LunaUser> {
  if (newRole === 'super_admin') {
    throw new Error('Il ruolo super admin non può essere assegnato manualmente.');
  }

  const targetSnap = await getDoc(doc(getFirebaseDb(), USERS_COLLECTION, targetUid));
  if (!targetSnap.exists()) {
    throw new Error('Utente target non trovato.');
  }

  const target = docToUser(targetUid, targetSnap.data());

  if (!canChangeRole(actor, target)) {
    throw new Error('Permessi insufficienti per modificare questo ruolo.');
  }

  if (newRole !== 'user' && newRole !== 'admin') {
    throw new Error('Ruolo non valido.');
  }

  await updateDoc(doc(getFirebaseDb(), USERS_COLLECTION, targetUid), {
    role: newRole,
    updatedAt: new Date().toISOString(),
  });

  const updated = await getDoc(doc(getFirebaseDb(), USERS_COLLECTION, targetUid));
  return docToUser(targetUid, updated.data()!);
}

function adminPremiumPeriod(now = new Date()) {
  const start = new Date(now);
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + 30);
  return {
    subscriptionPeriodStart: start.toISOString(),
    subscriptionPeriodEnd: end.toISOString(),
  };
}

export async function setUserTier(
  actor: LunaUser,
  targetUid: string,
  tier: SubscriptionTier
): Promise<LunaUser> {
  const targetSnap = await getDoc(doc(getFirebaseDb(), USERS_COLLECTION, targetUid));
  if (!targetSnap.exists()) {
    throw new Error('Utente target non trovato.');
  }

  const target = docToUser(targetUid, targetSnap.data());

  if (!canManageTier(actor, target)) {
    throw new Error('Permessi insufficienti per modificare il piano.');
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    tier,
    updatedAt: now,
  };

  if (tier === 'premium') {
    const period = adminPremiumPeriod();
    updates.messagesCount = 0;
    updates.liveMinutesUsed = 0;
    updates.liveMinutesWindowStart = null;
    updates.premiumEndedAt = null;
    updates.subscriptionStatus = 'active';
    updates.subscriptionPeriodStart = period.subscriptionPeriodStart;
    updates.subscriptionPeriodEnd = period.subscriptionPeriodEnd;
    updates.includedLessonsUsed = 0;
  } else if (target.tier === 'premium') {
    updates.premiumEndedAt = now;
    updates.subscriptionStatus = 'canceled';
  }

  await updateDoc(doc(getFirebaseDb(), USERS_COLLECTION, targetUid), updates);

  const updated = await getDoc(doc(getFirebaseDb(), USERS_COLLECTION, targetUid));
  return docToUser(targetUid, updated.data()!);
}

export async function listAllUsers(): Promise<LunaUser[]> {
  const snap = await getDocs(collection(getFirebaseDb(), USERS_COLLECTION));
  return snap.docs
    .map((docSnap) => docToUser(docSnap.id, docSnap.data()))
    .sort((a, b) => a.username.localeCompare(b.username, 'it', { sensitivity: 'base' }));
}

export type { ChatMessage };
