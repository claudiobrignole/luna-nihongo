import { FirebaseError } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp } from '../lib/firebase';
import { ensureFreshAuthToken } from './authCallable';
import type { BookingPlan } from '../types/booking';

function getFunctionsInstance() {
  return getFunctions(getFirebaseApp(), 'europe-west1');
}

export function formatBookingCallableError(err: unknown, language: 'en' | 'it'): string {
  if (err instanceof FirebaseError) {
    const code = err.code.replace(/^functions\//, '');
    const detail = err.message;

    if (code === 'unauthenticated') {
      return language === 'en' ? 'Please sign in to book.' : 'Accedi per prenotare.';
    }
    if (code === 'failed-precondition') {
      if (detail.includes('no teacher assigned')) {
        return language === 'en'
          ? 'This slot has no teacher assigned. Ask staff to recreate it.'
          : 'Questo slot non ha un maestro assegnato. Chiedi allo staff di ricrearlo.';
      }
      if (detail.includes('full') || detail.includes('Slot is')) {
        return language === 'en' ? 'This slot is full or no longer available.' : 'Questo slot è pieno o non più disponibile.';
      }
      return detail;
    }
    if (code === 'permission-denied' || code === 'internal' || code === 'unavailable') {
      return language === 'en'
        ? 'Booking service unavailable. Try again in a moment.'
        : 'Servizio prenotazioni non disponibile. Riprova tra poco.';
    }
    return detail;
  }
  return language === 'en'
    ? 'Booking failed. The slot may be full or no longer available.'
    : 'Prenotazione non riuscita. Lo slot potrebbe essere pieno o non più disponibile.';
}

export async function startFreeTrial(): Promise<{
  trialStartedAt: string;
  trialEndsAt: string;
  trialDays: number;
}> {
  await ensureFreshAuthToken();
  const fn = httpsCallable<Record<string, never>, {
    trialStartedAt: string;
    trialEndsAt: string;
    trialDays: number;
  }>(getFunctionsInstance(), 'startFreeTrial');
  const result = await fn({});
  return result.data;
}

export async function bookAvailabilitySlot(input: {
  slotId: string;
  name: string;
  email: string;
  level: string;
  notes?: string;
  plan: Extract<BookingPlan, 'trial_intro' | 'included' | 'extra_rebook' | 'coupon' | 'replacement'>;
  couponId?: string;
}): Promise<{
  bookingId: string;
  meetLink: string;
  date: string;
  time: string;
  plan: string;
}> {
  await ensureFreshAuthToken();
  const fn = httpsCallable<typeof input, {
    bookingId: string;
    meetLink: string;
    date: string;
    time: string;
    plan: string;
  }>(getFunctionsInstance(), 'bookAvailabilitySlot');
  const result = await fn(input);
  return result.data;
}
