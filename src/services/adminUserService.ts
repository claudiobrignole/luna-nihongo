import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp } from '../lib/firebase';

function getFunctionsInstance() {
  return getFunctions(getFirebaseApp(), 'europe-west1');
}

export async function adminDeleteUser(targetUid: string): Promise<void> {
  const fn = httpsCallable<{ targetUid: string }, { ok: boolean }>(
    getFunctionsInstance(),
    'adminDeleteUser',
  );
  await fn({ targetUid });
}
