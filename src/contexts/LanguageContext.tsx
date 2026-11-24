import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  normalizeLanguage,
  readStoredLanguage,
  writeStoredLanguage,
  type AppLanguage,
} from '../utils/language';
import { parsePath } from '../utils/routes';

/**
 * Lingua dedotta dal path pubblico corrente, SOLO quando il path la rende
 * esplicita (prefisso /en/...). Per un path senza quel prefisso (root /,
 * /blog, un'area app, ecc.) ritorna null: l'assenza del prefisso /en/ non
 * significa "italiano esplicito", significa "il path non si esprime" e la
 * precedenza deve passare al profilo utente o al default.
 *
 * Usata come sorgente iniziale quando non c'e' ancora una preferenza
 * esplicita salvata: un link /en/blog/... deve aprirsi in inglese anche al
 * primo caricamento, senza aspettare localStorage o un profilo utente.
 */
function readLanguageFromPath(): AppLanguage | null {
  if (typeof window === 'undefined') return null;
  const { language } = parsePath(window.location.pathname);
  return language === 'en' ? 'en' : null;
}

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
  toggleLanguage: () => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { currentUser, updateUser } = useAuth();
  const [explicitLanguage, setExplicitLanguage] = useState<AppLanguage | null>(() =>
    typeof window === 'undefined' ? null : readStoredLanguage(),
  );

  const storedLanguage = typeof window === 'undefined' ? null : readStoredLanguage();
  const profileLanguage = currentUser?.preferredLanguage
    ? normalizeLanguage(currentUser.preferredLanguage)
    : null;
  // Priorita': scelta esplicita in questa sessione > preferenza salvata >
  // lingua del path pubblico corrente (es. /en/...) > profilo utente > IT.
  // Il path viene prima del profilo cosi' un link /en/... condiviso apre
  // sempre in inglese, anche per un utente loggato con preferenza IT salvata
  // sul profilo ma senza nulla in storage su questo dispositivo/browser.
  const language: AppLanguage =
    explicitLanguage ?? storedLanguage ?? readLanguageFromPath() ?? profileLanguage ?? 'it';

  const setLanguage = useCallback(
    async (next: AppLanguage) => {
      const normalized = normalizeLanguage(next);
      setExplicitLanguage(normalized);
      writeStoredLanguage(normalized);

      if (currentUser) {
        await updateUser({ preferredLanguage: normalized });
      }
    },
    [currentUser, updateUser],
  );

  const toggleLanguage = useCallback(async () => {
    await setLanguage(language === 'it' ? 'en' : 'it');
  }, [language, setLanguage]);

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage }),
    [language, setLanguage, toggleLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
