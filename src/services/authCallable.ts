import { getFirebaseAuth } from '../lib/firebase';

/** Ensures Firebase Auth is ready and returns a fresh ID token for callables. */
export async function ensureFreshAuthToken(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) {
    await auth.currentUser.getIdToken(true);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      unsubscribe();
      reject(new Error('auth-timeout'));
    }, 8000);
    const unsubscribe = auth.onAuthStateChanged((fbUser) => {
      if (fbUser) {
        window.clearTimeout(timeout);
        unsubscribe();
        void fbUser.getIdToken(true).then(() => resolve(), reject);
      }
    });
  });
}

export function hasAuthenticatedUser(): boolean {
  return Boolean(getFirebaseAuth().currentUser);
}
