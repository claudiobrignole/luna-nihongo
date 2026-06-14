import { getFunctions, httpsCallable } from 'firebase/functions';
import { FirebaseError } from 'firebase/app';
import { getFirebaseApp } from '../lib/firebase';

function getFunctionsInstance() {
  return getFunctions(getFirebaseApp(), 'europe-west1');
}

export function formatCallableError(err: unknown): string {
  if (err instanceof FirebaseError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Errore sconosciuto';
}

export async function adminDeleteUser(targetUid: string): Promise<void> {
  const fn = httpsCallable<{ targetUid: string }, { ok: boolean }>(
    getFunctionsInstance(),
    'adminDeleteUser',
  );
  await fn({ targetUid });
}
