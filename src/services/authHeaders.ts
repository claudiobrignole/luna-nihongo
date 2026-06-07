import { getFirebaseAuth } from '../lib/firebase';

export async function getFirebaseIdToken(): Promise<string | null> {
  const user = getFirebaseAuth().currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getFirebaseIdToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}
