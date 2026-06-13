import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';

export async function assertAdmin(request: CallableRequest): Promise<string> {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Login required.');
  }

  const snap = await getFirestore().collection('users').doc(request.auth.uid).get();
  const role = snap.data()?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Admin access required.');
  }

  return request.auth.uid;
}
