import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp } from '../lib/firebase';

function getFunctionsInstance() {
  return getFunctions(getFirebaseApp(), 'europe-west1');
}

export async function startFreeTrial(): Promise<{
  trialStartedAt: string;
  trialEndsAt: string;
  trialDays: number;
}> {
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
  plan: 'trial_intro' | 'included';
}): Promise<{
  bookingId: string;
  meetLink: string;
  date: string;
  time: string;
  plan: string;
}> {
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
