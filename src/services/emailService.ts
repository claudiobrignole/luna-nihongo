import { FirebaseError } from 'firebase/app';
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

export function formatEmailCallableError(err: unknown, language: 'en' | 'it'): string {
  if (err instanceof FirebaseError) {
    const code = err.code.replace(/^functions\//, '');
    if (code === 'resource-exhausted') {
      return language === 'en'
        ? 'Please wait a moment before trying again.'
        : 'Attendi un momento prima di riprovare.';
    }
    if (code === 'failed-precondition' && err.message.includes('24 hours')) {
      return language === 'en'
        ? 'Lessons can only be changed at least 24 hours before the session.'
        : 'Le lezioni si possono modificare solo almeno 24 ore prima.';
    }
    if (code === 'failed-precondition' && err.message.includes('Extra lessons cannot')) {
      return language === 'en'
        ? 'Extra lessons cannot be rescheduled online. Cancel and book again with payment.'
        : 'Le lezioni extra non si possono riprogrammare online. Annulla e prenota di nuovo con pagamento.';
    }
    if (code === 'invalid-argument') {
      return language === 'en' ? 'Please check your input.' : 'Controlla i dati inseriti.';
    }
  }
  return language === 'en'
    ? 'Something went wrong. Try again later.'
    : 'Qualcosa è andato storto. Riprova più tardi.';
}

export async function subscribeNewsletter(input: {
  email: string;
  firstName?: string;
  language: 'en' | 'it';
}): Promise<void> {
  const fn = httpsCallable<typeof input, { ok: boolean }>(
    getFunctionsInstance(),
    'subscribeNewsletter',
  );
  await fn(input);
}

export async function syncMarketingConsent(): Promise<void> {
  const fn = httpsCallable<Record<string, never>, { ok: boolean }>(
    getFunctionsInstance(),
    'syncMarketingConsent',
  );
  await fn({});
}

export async function cancelBookingRemote(bookingId: string): Promise<void> {
  const fn = httpsCallable<{ bookingId: string }, { ok: boolean }>(
    getFunctionsInstance(),
    'cancelBooking',
  );
  await fn({ bookingId });
}

export async function rescheduleBookingRemote(
  bookingId: string,
  newSlotId: string,
): Promise<void> {
  const fn = httpsCallable<{ bookingId: string; newSlotId: string }, { ok: boolean }>(
    getFunctionsInstance(),
    'rescheduleBooking',
  );
  await fn({ bookingId, newSlotId });
}
