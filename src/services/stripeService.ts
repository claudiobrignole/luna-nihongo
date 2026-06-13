import { FirebaseError } from 'firebase/app';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { getFirebaseApp } from '../lib/firebase';

export function formatStripeCallableError(
  err: unknown,
  language: 'en' | 'it',
): string {
  if (err instanceof FirebaseError) {
    const code = err.code.replace(/^functions\//, '');
    const detail = err.message;

    if (code === 'unauthenticated') {
      return language === 'en'
        ? 'Please sign in before subscribing.'
        : 'Accedi prima di abbonarti.';
    }
    if (code === 'failed-precondition') {
      if (detail.includes('STRIPE_PRICE_ID')) {
        return language === 'en'
          ? 'Payments are not configured yet. Contact support.'
          : 'I pagamenti non sono ancora configurati. Contattaci.';
      }
      return language === 'en'
        ? 'Subscription setup is incomplete. Try again or contact support.'
        : 'Configurazione abbonamento incompleta. Riprova o contattaci.';
    }
    if (code === 'permission-denied' || code === 'internal') {
      return language === 'en'
        ? 'Payment service unavailable. Try again in a moment.'
        : 'Servizio di pagamento non disponibile. Riprova tra poco.';
    }
  }

  return language === 'en'
    ? 'Could not start checkout. Try again or contact support.'
    : 'Impossibile avviare il pagamento. Riprova o contattaci.';
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
  discountCouponId?: string;
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

export async function startGiftLessonCheckout(language: 'en' | 'it'): Promise<string> {
  const fn = httpsCallable<{ language: 'en' | 'it' }, { url: string }>(
    getFunctionsInstance(),
    'createGiftLessonCheckout',
  );
  const result = await fn({ language });
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
