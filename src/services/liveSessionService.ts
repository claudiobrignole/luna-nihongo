import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { getFirebaseApp } from '../lib/firebase';

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

export async function requestLiveSession(language: 'en' | 'it'): Promise<CreateLiveSessionResult> {
  const fn = httpsCallable<{ language: 'en' | 'it' }, CreateLiveSessionResult>(
    getFunctionsInstance(),
    'createLiveSession',
  );
  const result = await fn({ language });
  return result.data;
}

export async function reportLiveSessionEnd(durationSeconds: number): Promise<EndLiveSessionResult> {
  const fn = httpsCallable<{ durationSeconds: number }, EndLiveSessionResult>(
    getFunctionsInstance(),
    'endLiveSession',
  );
  const result = await fn({ durationSeconds });
  return result.data;
}

export function liveSessionErrorMessage(err: unknown, language: 'en' | 'it'): string {
  const code = typeof err === 'object' && err !== null && 'code' in err
    ? String((err as { code: string }).code)
    : '';
  const message = typeof err === 'object' && err !== null && 'message' in err
    ? String((err as { message: string }).message)
    : '';

  if (code.includes('resource-exhausted')) {
    return language === 'en'
      ? message || 'Live minutes limit reached for this month.'
      : message || 'Limite minuti live del mese raggiunto.';
  }
  if (code.includes('unauthenticated')) {
    return language === 'en' ? 'Please log in to use Luna Live.' : 'Accedi per usare Luna Live.';
  }
  if (code.includes('functions/unavailable') || code.includes('internal')) {
    return language === 'en'
      ? 'Live service unavailable. Deploy Firebase Functions (createLiveSession) and set GEMINI_API_KEY secret.'
      : 'Servizio live non disponibile. Esegui il deploy delle Firebase Functions (createLiveSession) e imposta il secret GEMINI_API_KEY.';
  }
  return message || (language === 'en' ? 'Could not start live session.' : 'Impossibile avviare la sessione live.');
}
