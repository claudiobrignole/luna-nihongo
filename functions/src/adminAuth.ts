import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';

export async function assertSuperAdmin(request: CallableRequest): Promise<string> {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Login required.');
  }

  const snap = await getFirestore().collection('users').doc(request.auth.uid).get();
  if (snap.data()?.role !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Super admin access required.');
  }

  return request.auth.uid;
}

export async function assertStaff(request: CallableRequest): Promise<{ uid: string; role: string }> {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Login required.');
  }

  const snap = await getFirestore().collection('users').doc(request.auth.uid).get();
  const role = String(snap.data()?.role ?? '');
  if (role !== 'super_admin' && role !== 'teacher') {
    throw new HttpsError('permission-denied', 'Staff access required.');
  }

  return { uid: request.auth.uid, role };
}

/** @deprecated use assertStaff */
export async function assertAdmin(request: CallableRequest): Promise<string> {
  const { uid } = await assertStaff(request);
  return uid;
}
