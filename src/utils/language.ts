import {
  LANGUAGE_STORAGE_KEY,
  LANGUAGE_SUGGEST_DISMISSED_KEY,
} from '../constants/language';

export type AppLanguage = 'it' | 'en';

export function normalizeLanguage(value: unknown): AppLanguage {
  return value === 'en' ? 'en' : 'it';
}

export function readStoredLanguage(): AppLanguage | null {
  try {
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (raw === 'it' || raw === 'en') return raw;
    return null;
  } catch {
    return null;
  }
}

export function writeStoredLanguage(language: AppLanguage): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // storage unavailable
  }
}

export function readLanguageSuggestDismissed(): boolean {
  try {
    return localStorage.getItem(LANGUAGE_SUGGEST_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeLanguageSuggestDismissed(): void {
  try {
    localStorage.setItem(LANGUAGE_SUGGEST_DISMISSED_KEY, '1');
  } catch {
    // storage unavailable
  }
}

export function browserPrefersNonItalian(): boolean {
  if (typeof navigator === 'undefined') return false;
  const langs =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];
  return !langs.some((lang) => lang.toLowerCase().startsWith('it'));
}

export function shouldSuggestEnglish(
  stored: AppLanguage | null,
  dismissed: boolean,
  currentLang: AppLanguage,
): boolean {
  if (currentLang !== 'it') return false;
  if (stored !== null) return false;
  if (dismissed) return false;
  return browserPrefersNonItalian();
}
