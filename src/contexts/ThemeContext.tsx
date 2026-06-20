import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ThemePreference } from '../types/user';
import { useAuth } from './AuthContext';
import {
  applyResolvedTheme,
  clearStoredThemePreference,
  getSystemPrefersDark,
  normalizeThemePreference,
  readStoredThemePreference,
  resolveTheme,
  type ResolvedTheme,
  writeStoredThemePreference,
} from '../utils/theme';

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, loading, updateUser } = useAuth();
  const [systemDark, setSystemDark] = useState(() => getSystemPrefersDark());
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (typeof window === 'undefined') return 'system';
    return readStoredThemePreference() ?? 'system';
  });

  useEffect(() => {
    if (loading) return;

    if (!currentUser) {
      clearStoredThemePreference();
      setPreferenceState('system');
      return;
    }

    const fromProfile = normalizeThemePreference(currentUser.themePreference);
    setPreferenceState(fromProfile);
    writeStoredThemePreference(fromProfile);
  }, [loading, currentUser?.id, currentUser?.themePreference]);

  const resolvedTheme = resolveTheme(preference, systemDark);

  useEffect(() => {
    applyResolvedTheme(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (preference !== 'system') return undefined;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback(
    async (next: ThemePreference) => {
      const normalized = normalizeThemePreference(next);
      setPreferenceState(normalized);
      writeStoredThemePreference(normalized);

      if (currentUser) {
        await updateUser({ themePreference: normalized });
      }
    },
    [currentUser, updateUser],
  );

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
