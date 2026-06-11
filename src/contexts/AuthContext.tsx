import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { syncMarketingConsent } from '../services/emailService';
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase';
import {
  ensureUserProfile,
  getUserProfile,
  updateUserProfile,
} from '../services/userService';
import type { LunaUser } from '../types/user';

interface AuthContextValue {
  currentUser: LunaUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  authError: string | null;
  signIn: (email: string, password: string, language: 'en' | 'it') => Promise<void>;
  signUp: (
    email: string,
    password: string,
    username: string,
    language: 'en' | 'it',
    options?: { marketingConsent?: boolean },
  ) => Promise<void>;
  resetPassword: (email: string, language: 'en' | 'it') => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<LunaUser>) => Promise<LunaUser>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapFirebaseAuthError(code: string, language: 'en' | 'it'): string {
  const messages: Record<string, { en: string; it: string }> = {
    'auth/invalid-email': {
      en: 'Invalid email address.',
      it: 'Indirizzo email non valido.',
    },
    'auth/user-disabled': {
      en: 'This account has been disabled.',
      it: 'Questo account è stato disabilitato.',
    },
    'auth/user-not-found': {
      en: 'No account found with this email.',
      it: 'Nessun account trovato con questa email.',
    },
    'auth/wrong-password': {
      en: 'Incorrect password.',
      it: 'Password errata.',
    },
    'auth/invalid-credential': {
      en: 'Invalid email or password.',
      it: 'Email o password non validi.',
    },
    'auth/email-already-in-use': {
      en: 'An account with this email already exists.',
      it: 'Esiste già un account con questa email.',
    },
    'auth/weak-password': {
      en: 'Password must be at least 6 characters.',
      it: 'La password deve avere almeno 6 caratteri.',
    },
    'auth/too-many-requests': {
      en: 'Too many attempts. Try again later.',
      it: 'Troppi tentativi. Riprova più tardi.',
    },
  };

  const entry = messages[code];
  if (entry) return entry[language];
  return language === 'en'
    ? 'Authentication failed. Please try again.'
    : 'Autenticazione fallita. Riprova.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<LunaUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured());
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    const auth = getFirebaseAuth();
    const fbUser = auth.currentUser;
    if (!fbUser) {
      setCurrentUser(null);
      return;
    }
    const profile = await getUserProfile(fbUser.uid);
    if (profile) setCurrentUser(profile);
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          let profile = await getUserProfile(fbUser.uid);
          if (!profile) {
            profile = await ensureUserProfile(
              fbUser.uid,
              fbUser.email ?? '',
              fbUser.displayName ?? fbUser.email?.split('@')[0] ?? 'User'
            );
          }
          setCurrentUser(profile);
        } catch (err) {
          console.error('Failed to load user profile', err);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(
    async (email: string, password: string, language: 'en' | 'it') => {
      setAuthError(null);
      try {
        const auth = getFirebaseAuth();
        const credential = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
        await ensureUserProfile(
          credential.user.uid,
          credential.user.email ?? email,
          credential.user.displayName ?? email.split('@')[0],
          language
        );
      } catch (err: unknown) {
        const code = (err as { code?: string }).code ?? '';
        const message = err instanceof Error ? err.message : '';
        if (code.includes('permission-denied') || message.includes('Missing or insufficient permissions')) {
          throw new Error(
            language === 'en'
              ? 'Could not load your profile. Check Firestore rules or try again.'
              : 'Impossibile caricare il profilo. Controlla le regole Firestore o riprova.',
            { cause: err },
          );
        }
        throw new Error(mapFirebaseAuthError(code, language), { cause: err });
      }
    },
    []
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      username: string,
      language: 'en' | 'it',
      options?: { marketingConsent?: boolean },
    ) => {
      setAuthError(null);
      try {
        const auth = getFirebaseAuth();
        const credential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
        await updateProfile(credential.user, { displayName: username.trim() });
        try {
          await sendEmailVerification(credential.user);
        } catch (verifyErr) {
          console.warn('Email verification send failed', verifyErr);
        }
        const profile = await ensureUserProfile(
          credential.user.uid,
          email,
          username,
          language,
          { marketingConsent: options?.marketingConsent === true },
        );
        setCurrentUser(profile);
        if (options?.marketingConsent === true) {
          void syncMarketingConsent().catch((syncErr) => {
            console.warn('SendFox sync failed', syncErr);
          });
        }
      } catch (err: unknown) {
        const code = (err as { code?: string }).code ?? '';
        throw new Error(mapFirebaseAuthError(code, language), { cause: err });
      }
    },
    [],
  );

  const resetPassword = useCallback(async (email: string, language: 'en' | 'it') => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      throw new Error(mapFirebaseAuthError(code, language), { cause: err });
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(getFirebaseAuth());
    setCurrentUser(null);
    setFirebaseUser(null);
  }, []);

  const updateUser = useCallback(
    async (updates: Partial<LunaUser>) => {
      if (!currentUser) {
        throw new Error('Nessun utente autenticato.');
      }
      const updated = await updateUserProfile(currentUser.id, updates);
      setCurrentUser(updated);
      return updated;
    },
    [currentUser]
  );

  const value = useMemo(
    () => ({
      currentUser,
      firebaseUser,
      loading,
      authError,
      signIn,
      signUp,
      resetPassword,
      signOut,
      updateUser,
      refreshUser,
    }),
    [currentUser, firebaseUser, loading, authError, signIn, signUp, resetPassword, signOut, updateUser, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook exported alongside provider — standard React context pattern.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
