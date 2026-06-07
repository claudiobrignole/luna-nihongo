import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Query } from 'firebase-admin/firestore';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';

const PROTECTED_SUPER_ADMIN_EMAIL = 'claudio@brignole.ch';

async function deleteQueryBatch(
  query: Query,
  batchSize = 100,
): Promise<void> {
  const snap = await query.limit(batchSize).get();
  if (snap.empty) return;

  const db = getFirestore();
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  if (snap.size >= batchSize) {
    await deleteQueryBatch(query, batchSize);
  }
}

async function deleteUserSubcollections(uid: string): Promise<void> {
  const db = getFirestore();
  const userRef = db.collection('users').doc(uid);
  const subcollections = ['srs', 'bookings', 'activity', 'liveSessions'];

  for (const name of subcollections) {
    await deleteQueryBatch(userRef.collection(name));
  }
}

async function assertSuperAdmin(request: CallableRequest): Promise<string> {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Login required.');
  }

  const db = getFirestore();
  const actorSnap = await db.collection('users').doc(request.auth.uid).get();
  if (!actorSnap.exists || actorSnap.data()?.role !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Super admin required.');
  }

  return request.auth.uid;
}

export const adminDeleteUser = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 120,
  },
  async (request) => {
    const actorUid = await assertSuperAdmin(request);
    const targetUid = typeof request.data?.targetUid === 'string' ? request.data.targetUid.trim() : '';

    if (!targetUid) {
      throw new HttpsError('invalid-argument', 'targetUid is required.');
    }
    if (targetUid === actorUid) {
      throw new HttpsError('failed-precondition', 'You cannot delete your own account.');
    }

    const db = getFirestore();
    const targetRef = db.collection('users').doc(targetUid);
    const targetSnap = await targetRef.get();

    if (!targetSnap.exists) {
      throw new HttpsError('not-found', 'User not found.');
    }

    const email = String(targetSnap.data()?.email ?? '').trim().toLowerCase();
    if (email === PROTECTED_SUPER_ADMIN_EMAIL) {
      throw new HttpsError('permission-denied', 'This account cannot be deleted.');
    }

    await deleteUserSubcollections(targetUid);
    await targetRef.delete();

    try {
      await getAuth().deleteUser(targetUid);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== 'auth/user-not-found') {
        throw new HttpsError(
          'internal',
          'Firestore profile deleted but Auth account removal failed. Remove the Auth user manually.',
        );
      }
    }

    return { ok: true, targetUid };
  },
);
