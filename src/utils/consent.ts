// Gestione consenso cookie — conforme a GDPR (opt-in) e nuova LPD svizzera.
// Categorie non necessarie disattivate finché l'utente non sceglie.

export type ConsentCategory = 'necessary' | 'preferences' | 'analytics' | 'marketing';

export interface ConsentState {
  necessary: true; // sempre attivi, non disattivabili
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
}

export interface StoredConsent {
  v: number;
  ts: string; // ISO timestamp della scelta
  categories: ConsentState;
}

// Incrementare quando cambiano le finalità: forza un nuovo consenso.
export const CONSENT_VERSION = 1;
const STORAGE_KEY = 'luna_cookie_consent';
export const CONSENT_EVENT = 'luna-consent-change';

export const ALL_DENIED: ConsentState = {
  necessary: true,
  preferences: false,
  analytics: false,
  marketing: false,
};

export const ALL_GRANTED: ConsentState = {
  necessary: true,
  preferences: true,
  analytics: true,
  marketing: true,
};

export function loadConsent(): StoredConsent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (!parsed || parsed.v !== CONSENT_VERSION || !parsed.categories) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveConsent(categories: ConsentState): StoredConsent {
  const record: StoredConsent = {
    v: CONSENT_VERSION,
    ts: new Date().toISOString(),
    categories: { ...categories, necessary: true },
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // storage non disponibile: il consenso vale per la sola sessione corrente
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: record }));
  }
  return record;
}

/** Comodo per gating di script futuri: `if (isAllowed('analytics')) {...}`. */
export function isAllowed(category: ConsentCategory): boolean {
  if (category === 'necessary') return true;
  const stored = loadConsent();
  return stored ? Boolean(stored.categories[category]) : false;
}
