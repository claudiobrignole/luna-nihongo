import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { getFirebaseApp } from '../lib/firebase';

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

export async function startPremiumCheckout(language: 'en' | 'it'): Promise<string> {
  const fn = httpsCallable<{ language: 'en' | 'it' }, { url: string }>(
    getFunctionsInstance(),
    'createStripeCheckout',
  );
  const result = await fn({ language });
  if (!result.data.url) {
    throw new Error('Checkout URL missing');
  }
  return result.data.url;
}

export async function startExtraLessonCheckout(input: {
  slotId: string;
  name: string;
  email: string;
  level: string;
  notes?: string;
  language: 'en' | 'it';
}): Promise<string> {
  const fn = httpsCallable<typeof input, { url: string }>(
    getFunctionsInstance(),
    'createExtraLessonCheckout',
  );
  const result = await fn(input);
  if (!result.data.url) {
    throw new Error('Checkout URL missing');
  }
  return result.data.url;
}

export async function openPremiumPortal(): Promise<string> {
  const fn = httpsCallable<Record<string, never>, { url: string }>(
    getFunctionsInstance(),
    'createStripePortal',
  );
  const result = await fn({});
  if (!result.data.url) {
    throw new Error('Portal URL missing');
  }
  return result.data.url;
}
