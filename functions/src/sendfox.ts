import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { ensureFirebaseAdmin } from './ensureAdmin';

ensureFirebaseAdmin();

const sendfoxApiToken = defineSecret('SENDFOX_API_TOKEN');
const sendfoxListIdLunaIt = defineSecret('SENDFOX_LIST_ID_LUNA_IT');
const sendfoxListIdLunaEn = defineSecret('SENDFOX_LIST_ID_LUNA_EN');

const SENDFOX_API = 'https://api.sendfox.com/contacts';
const RATE_LIMIT_MS = 60_000;

function listIdForLanguage(language: 'it' | 'en', itId: string, enId: string): string {
  const id = language === 'en' ? enId : itId;
  if (!id?.trim()) {
    throw new HttpsError('failed-precondition', 'SendFox list ID not configured.');
  }
  return id.trim();
}

export async function addContactToSendFoxList(
  apiToken: string,
  email: string,
  firstName: string | undefined,
  listId: string,
): Promise<void> {
  const token = apiToken?.trim();
  if (!token) {
    console.warn('SendFox: SENDFOX_API_TOKEN not configured, skipping sync');
    return;
  }

  const res = await fetch(SENDFOX_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      first_name: firstName?.trim() || undefined,
      lists: [Number(listId) || listId],
    }),
  });

  if (res.ok || res.status === 409 || res.status === 422) {
    return;
  }

  const body = await res.text();
  console.error('SendFox API error', res.status, body.slice(0, 500));
  throw new Error(`SendFox failed (${res.status})`);
}

async function checkNewsletterRateLimit(email: string): Promise<void> {
  const db = getFirestore();
  const key = email.trim().toLowerCase();
  const ref = db.collection('newsletterAttempts').doc(key);
  const snap = await ref.get();
  const now = Date.now();

  if (snap.exists) {
    const lastAt = snap.data()?.lastAt as number | undefined;
    if (typeof lastAt === 'number' && now - lastAt < RATE_LIMIT_MS) {
      throw new HttpsError('resource-exhausted', 'Please wait before subscribing again.');
    }
  }

  await ref.set({ lastAt: now, email: key }, { merge: true });
}

export const subscribeNewsletter = onCall(
  {
    region: 'europe-west1',
    secrets: [sendfoxApiToken, sendfoxListIdLunaIt, sendfoxListIdLunaEn],
    invoker: 'public',
  },
  async (request) => {
    const email = typeof request.data?.email === 'string' ? request.data.email.trim() : '';
    const firstName = typeof request.data?.firstName === 'string' ? request.data.firstName.trim() : '';
    const language = request.data?.language === 'en' ? 'en' : 'it';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpsError('invalid-argument', 'Valid email is required.');
    }

    await checkNewsletterRateLimit(email);

    const listId = listIdForLanguage(
      language,
      sendfoxListIdLunaIt.value(),
      sendfoxListIdLunaEn.value(),
    );

    await addContactToSendFoxList(sendfoxApiToken.value(), email, firstName || undefined, listId);

    return { ok: true };
  },
);

export const syncMarketingConsent = onCall(
  {
    region: 'europe-west1',
    secrets: [sendfoxApiToken, sendfoxListIdLunaIt, sendfoxListIdLunaEn],
    invoker: 'public',
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Login required.');
    }

    const uid = request.auth.uid;
    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      throw new HttpsError('not-found', 'User profile not found.');
    }

    const user = snap.data() ?? {};
    if (user.marketingConsent !== true) {
      throw new HttpsError('failed-precondition', 'Marketing consent not granted.');
    }

    const email = String(user.email ?? request.auth.token.email ?? '').trim();
    if (!email) {
      throw new HttpsError('failed-precondition', 'User email missing.');
    }

    const language = user.preferredLanguage === 'en' ? 'en' : 'it';
    const listId = listIdForLanguage(
      language,
      sendfoxListIdLunaIt.value(),
      sendfoxListIdLunaEn.value(),
    );

    await addContactToSendFoxList(
      sendfoxApiToken.value(),
      email,
      String(user.username ?? ''),
      listId,
    );

    await userRef.set(
      {
        sendfoxSyncedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return { ok: true };
  },
);
