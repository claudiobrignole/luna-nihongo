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
  const language: AppLanguage = explicitLanguage ?? storedLanguage ?? profileLanguage ?? 'it';

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
