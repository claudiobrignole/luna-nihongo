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

function defaultMemory(email: string, username: string, language: 'en' | 'it'): string {
  if (normalizeEmail(email) === normalizeEmail(SUPER_ADMIN_EMAIL)) {
    return language === 'en'
      ? 'Platform owner and super administrator.'
      : 'Proprietario della piattaforma e super amministratore.';
  }
  return language === 'en'
    ? `User ${username} started learning Japanese.`
    : `L'utente ${username} ha iniziato a studiare il giapponese.`;
}

function docToUser(uid: string, data: DocumentData): LunaUser {
  return {
    id: uid,
    email: data.email ?? '',
    username: data.username ?? '',
    role: data.role ?? 'user',
    tier: data.tier ?? 'free',
    completedUnits: data.completedUnits ?? [],
    xp: data.xp ?? 0,
    joinedDate: data.joinedDate ?? '',
    messagesCount: data.messagesCount ?? 0,
    memory: data.memory ?? '',
    chatHistory: data.chatHistory ?? [],
    onboardingCompleted:
      data.onboardingCompleted === true
        ? true
        : data.onboardingCompleted === false
          ? false
          : (data.completedUnits?.length ?? 0) > 0,
    preferredStartLevel: typeof data.preferredStartLevel === 'number' ? data.preferredStartLevel : 0,
    showRomaji: data.showRomaji !== false,
    tutorVoiceEnabled: data.tutorVoiceEnabled !== false,
    liveMinutesUsed: data.liveMinutesUsed ?? 0,
    liveMinutesPeriod: data.liveMinutesPeriod ?? '',
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
  language: 'en' | 'it' = 'it'
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
    memory: defaultMemory(normalizedEmail, username, language),
    chatHistory: [],
    onboardingCompleted: false,
    preferredStartLevel: 0,
    showRomaji: true,
    tutorVoiceEnabled: true,
    liveMinutesUsed: 0,
    liveMinutesPeriod: '',
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
      | 'chatHistory'
      | 'onboardingCompleted'
      | 'preferredStartLevel'
      | 'showRomaji'
      | 'tutorVoiceEnabled'
      | 'liveMinutesUsed'
      | 'liveMinutesPeriod'
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

  const updates: Record<string, unknown> = {
    tier,
    updatedAt: new Date().toISOString(),
  };

  if (tier === 'premium') {
    updates.messagesCount = 0;
    updates.liveMinutesUsed = 0;
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
