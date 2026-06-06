import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { getFirebaseApp } from '../lib/firebase';
import { buildLiveSystemPrompt } from './livePrompt';
import type { LunaUser } from '../types/user';
import {
  liveMinutesLimit,
  liveMinutesRemaining,
  MAX_LIVE_SESSION_MINUTES,
  resolveLiveMinutesUsed,
} from '../types/user';

export interface CreateLiveSessionResult {
  token: string;
  model: string;
  maxSessionSeconds: number;
  minutesRemaining: number;
  minutesLimit: number;
  minutesUsed: number;
}

export interface EndLiveSessionResult {
  billedMinutes: number;
  minutesUsed: number;
  minutesRemaining: number;
  minutesLimit: number;
}

let functionsInstance: ReturnType<typeof getFunctions> | null = null;
let emulatorConnected = false;

function getFunctionsInstance() {
  if (!functionsInstance) {
    functionsInstance = getFunctions(getFirebaseApp(), 'europe-west1');
    if (import.meta.env.DEV && import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === 'true' && !emulatorConnected) {
      connectFunctionsEmulator(functionsInstance, 'localhost', 5001);
      emulatorConnected = true;
    }
  }
  return functionsInstance;
}

function sessionQuota(user: LunaUser): Pick<CreateLiveSessionResult, 'maxSessionSeconds' | 'minutesRemaining' | 'minutesLimit' | 'minutesUsed'> {
  const limit = liveMinutesLimit(user.tier);
  const used = resolveLiveMinutesUsed(user);
  const minutesRemaining = liveMinutesRemaining(user);
  const maxSessionSeconds = Math.min(
    MAX_LIVE_SESSION_MINUTES * 60,
    Math.floor(minutesRemaining * 60),
  );
  return { maxSessionSeconds, minutesRemaining, minutesLimit: limit, minutesUsed: used };
}

async function requestLiveSessionViaPhp(
  user: LunaUser,
  language: 'en' | 'it',
): Promise<Pick<CreateLiveSessionResult, 'token' | 'model'>> {
  const systemPrompt = buildLiveSystemPrompt(user, language);
  const response = await fetch('/api/live-session.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, language }),
  });

  const data = await response.json().catch(() => ({})) as { token?: string; model?: string; error?: string };

  if (!response.ok || !data.token || !data.model) {
    throw new Error(data.error || `Live session API failed (${response.status})`);
  }

  return { token: data.token, model: data.model };
}

async function requestLiveSessionViaFirebase(language: 'en' | 'it'): Promise<CreateLiveSessionResult> {
  const fn = httpsCallable<{ language: 'en' | 'it' }, CreateLiveSessionResult>(
    getFunctionsInstance(),
    'createLiveSession',
  );
  const result = await fn({ language });
  return result.data;
}

export async function requestLiveSession(user: LunaUser, language: 'en' | 'it'): Promise<CreateLiveSessionResult> {
  const quota = sessionQuota(user);

  if (quota.maxSessionSeconds < 30) {
    throw Object.assign(new Error('Not enough live minutes remaining.'), { code: 'functions/resource-exhausted' });
  }

  const useEmulator = import.meta.env.DEV && import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === 'true';

  if (!useEmulator) {
    try {
      const php = await requestLiveSessionViaPhp(user, language);
      return { ...php, ...quota };
    } catch (phpErr) {
      const unreachable = phpErr instanceof TypeError
        || (phpErr instanceof Error && /failed to fetch|network|ECONNREFUSED/i.test(phpErr.message));
      if (!unreachable) {
        throw phpErr;
      }
      console.warn('live-session.php unreachable, trying Firebase callable', phpErr);
    }
  }

  return requestLiveSessionViaFirebase(language);
}

export function computeBilledMinutes(durationSeconds: number): number {
  const cappedSeconds = Math.min(Math.round(durationSeconds), MAX_LIVE_SESSION_MINUTES * 60);
  return Math.max(1, Math.ceil(cappedSeconds / 60));
}

export async function reportLiveSessionEnd(
  user: LunaUser,
  durationSeconds: number,
): Promise<EndLiveSessionResult> {
  const billedMinutes = computeBilledMinutes(durationSeconds);
  const limit = liveMinutesLimit(user.tier);
  const used = resolveLiveMinutesUsed(user);
  const newUsed = Math.min(limit, used + billedMinutes);

  try {
    const fn = httpsCallable<{ durationSeconds: number }, EndLiveSessionResult>(
      getFunctionsInstance(),
      'endLiveSession',
    );
    const result = await fn({ durationSeconds });
    return result.data;
  } catch (err) {
    console.warn('endLiveSession callable failed, using client-side quota', err);
    return {
      billedMinutes,
      minutesUsed: newUsed,
      minutesRemaining: Math.max(0, limit - newUsed),
      minutesLimit: limit,
    };
  }
}

export function liveSessionErrorMessage(err: unknown, language: 'en' | 'it'): string {
  const code = typeof err === 'object' && err !== null && 'code' in err
    ? String((err as { code: string }).code)
    : '';
  const message = typeof err === 'object' && err !== null && 'message' in err
    ? String((err as { message: string }).message)
    : '';
  const details = typeof err === 'object' && err !== null && 'details' in err
    ? (err as { details: unknown }).details
    : undefined;
  const detailText = typeof details === 'string' ? details : '';

  if (code.includes('resource-exhausted')) {
    return language === 'en'
      ? message || 'Live minutes limit reached for this month.'
      : message || 'Limite minuti live del mese raggiunto.';
  }
  if (code.includes('unauthenticated')) {
    return language === 'en' ? 'Please log in to use Luna Live.' : 'Accedi per usare Luna Live.';
  }
  if (code.includes('failed-precondition')) {
    return message || detailText || (language === 'en'
      ? 'Live session could not start. Check GEMINI_API_KEY on the server.'
      : 'Impossibile avviare la sessione live. Verifica GEMINI_API_KEY sul server.');
  }
  if (code.includes('functions/unavailable') || code.includes('unavailable')) {
    return language === 'en'
      ? 'Live service unreachable. Check network or API configuration.'
      : 'Servizio live non raggiungibile. Controlla rete o configurazione API.';
  }
  if (code.includes('internal') || message === 'internal') {
    return language === 'en'
      ? 'Live service unavailable (Firebase Functions). Local dev: run npm run dev:all with GEMINI_API_KEY in .env.'
      : 'Servizio live non disponibile (Firebase Functions). In locale: npm run dev:all con GEMINI_API_KEY in .env.';
  }
  if (message && message !== 'internal') {
    return message;
  }
  if (code.includes('not-found')) {
    return language === 'en'
      ? 'User profile not found. Log out and sign in again.'
      : 'Profilo utente non trovato. Esci e accedi di nuovo.';
  }
  return message || detailText || (language === 'en' ? 'Could not start live session.' : 'Impossibile avviare la sessione live.');
}
