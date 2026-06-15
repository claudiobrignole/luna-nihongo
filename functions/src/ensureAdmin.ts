import { getApps, initializeApp } from 'firebase-admin/app';

/** Gen2 isolates each function; index.ts initializeApp() may not run. */
export function ensureFirebaseAdmin(): void {
  if (!getApps().length) {
    initializeApp();
  }
}
