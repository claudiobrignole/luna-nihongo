import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ALL_DENIED,
  ALL_GRANTED,
  loadConsent,
  saveConsent,
  type ConsentState,
} from '../utils/consent';

interface ConsentContextValue {
  /** null finché l'utente non ha scelto. */
  decision: ConsentState | null;
  bannerOpen: boolean;
  prefsOpen: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  savePreferences: (categories: ConsentState) => void;
  openPreferences: () => void;
  closePreferences: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export { ConsentContext };

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [decision, setDecision] = useState<ConsentState | null>(() => loadConsent()?.categories ?? null);
  const [prefsOpen, setPrefsOpen] = useState(false);

  const commit = useCallback((categories: ConsentState) => {
    saveConsent(categories);
    setDecision({ ...categories, necessary: true });
    setPrefsOpen(false);
  }, []);

  const acceptAll = useCallback(() => commit(ALL_GRANTED), [commit]);
  const rejectAll = useCallback(() => commit(ALL_DENIED), [commit]);
  const savePreferences = useCallback((c: ConsentState) => commit(c), [commit]);
  const openPreferences = useCallback(() => setPrefsOpen(true), []);
  const closePreferences = useCallback(() => setPrefsOpen(false), []);

  // Sincronizza tra schede/finestre dello stesso browser.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'luna_cookie_consent') setDecision(loadConsent()?.categories ?? null);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      decision,
      bannerOpen: decision === null,
      prefsOpen,
      acceptAll,
      rejectAll,
      savePreferences,
      openPreferences,
      closePreferences,
    }),
    [decision, prefsOpen, acceptAll, rejectAll, savePreferences, openPreferences, closePreferences],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}
