import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp } from '../lib/firebase';

function getFunctionsInstance() {
  return getFunctions(getFirebaseApp(), 'europe-west1');
}

export async function adminCancelBookingRemote(input: {
  targetUid: string;
  bookingId: string;
  reason?: string;
}): Promise<{ ok: boolean; discountCode: string }> {
  const fn = httpsCallable<typeof input, { ok: boolean; discountCode: string }>(
    getFunctionsInstance(),
    'adminCancelBooking',
  );
  const result = await fn(input);
  return result.data;
}

export async function adminDeactivateSlotRemote(input: {
  slotId: string;
  reason?: string;
}): Promise<{ ok: boolean; cancelled: number }> {
  const fn = httpsCallable<typeof input, { ok: boolean; cancelled: number }>(
    getFunctionsInstance(),
    'adminDeactivateSlot',
  );
  const result = await fn(input);
  return result.data;
}
