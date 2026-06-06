import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { buildLiveSystemPrompt } from './tutorPrompt';
import {
  MAX_LIVE_SESSION_MINUTES,
  monthlyLimit,
  normalizeLiveUsage,
} from './liveLimits';
import { createLiveSessionToken } from './liveToken';

initializeApp();

const geminiApiKey = defineSecret('GEMINI_API_KEY');

interface UserDoc {
  username?: string;
  xp?: number;
  completedUnits?: string[];
  preferredStartLevel?: number;
  memory?: string;
  tier?: 'free' | 'premium';
  liveMinutesUsed?: number;
  liveMinutesPeriod?: string;
}

export const createLiveSession = onCall(
  {
    secrets: [geminiApiKey],
    region: 'europe-west1',
    timeoutSeconds: 30,
    // Callable clients send Firebase Auth in the request body; Cloud Run must allow the HTTP call.
    invoker: 'public',
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Login required for Luna Live.');
    }

    const language = request.data?.language === 'en' ? 'en' : 'it';
    const uid = request.auth.uid;
    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      throw new HttpsError('not-found', 'User profile not found.');
    }

    const user = snap.data() as UserDoc;
    const tier = user.tier === 'premium' ? 'premium' : 'free';
    const limit = monthlyLimit(tier);
    const { used, period } = normalizeLiveUsage(user.liveMinutesUsed, user.liveMinutesPeriod);

    if (used >= limit) {
      throw new HttpsError(
        'resource-exhausted',
        tier === 'free'
          ? 'Free live minutes used this month. Upgrade to Premium for more Luna Live time.'
          : 'Live minutes limit reached for this month.',
      );
    }

    const minutesRemaining = Math.max(0, limit - used);
    const maxSessionSeconds = Math.min(
      MAX_LIVE_SESSION_MINUTES * 60,
      Math.floor(minutesRemaining * 60),
    );

    if (maxSessionSeconds < 30) {
      throw new HttpsError('resource-exhausted', 'Not enough live minutes remaining.');
    }

    const systemInstruction = buildLiveSystemPrompt(
      {
        username: user.username ?? 'Student',
        xp: user.xp ?? 0,
        completedUnits: user.completedUnits ?? [],
        preferredStartLevel: typeof user.preferredStartLevel === 'number' ? user.preferredStartLevel : 0,
        memory: user.memory ?? '',
        tier,
      },
      language,
    );

    const apiKey = geminiApiKey.value();
    if (!apiKey?.trim()) {
      throw new HttpsError(
        'failed-precondition',
        'GEMINI_API_KEY secret is missing. Run: firebase functions:secrets:set GEMINI_API_KEY',
      );
    }

    let tokenName: string;
    let liveModel: string;
    try {
      const created = await createLiveSessionToken(apiKey, systemInstruction);
      tokenName = created.token;
      liveModel = created.model;
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Could not create live session token.';
      console.error('createLiveSessionToken failed', detail);
      // Use failed-precondition so the client receives the message (internal hides it).
      throw new HttpsError('failed-precondition', detail);
    }

    if (user.liveMinutesPeriod !== period) {
      await userRef.update({
        liveMinutesPeriod: period,
        liveMinutesUsed: 0,
        updatedAt: new Date().toISOString(),
      });
    }

    return {
      token: tokenName,
      model: liveModel,
      maxSessionSeconds,
      minutesRemaining,
      minutesLimit: limit,
      minutesUsed: used,
    };
  },
);

export const endLiveSession = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 30,
    invoker: 'public',
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Login required.');
    }

    const durationSeconds = Number(request.data?.durationSeconds);
    if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
      throw new HttpsError('invalid-argument', 'Invalid session duration.');
    }

    const cappedSeconds = Math.min(
      Math.round(durationSeconds),
      MAX_LIVE_SESSION_MINUTES * 60,
    );
    const billedMinutes = Math.max(1, Math.ceil(cappedSeconds / 60));

    const uid = request.auth.uid;
    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      throw new HttpsError('not-found', 'User profile not found.');
    }

    const user = snap.data() as UserDoc;
    const tier = user.tier === 'premium' ? 'premium' : 'free';
    const limit = monthlyLimit(tier);
    const { used, period } = normalizeLiveUsage(user.liveMinutesUsed, user.liveMinutesPeriod);
    const newUsed = Math.min(limit, used + billedMinutes);

    await userRef.update({
      liveMinutesUsed: newUsed,
      liveMinutesPeriod: period,
      updatedAt: new Date().toISOString(),
    });

    await userRef.collection('liveSessions').add({
      durationSeconds: cappedSeconds,
      billedMinutes,
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      billedMinutes,
      minutesUsed: newUsed,
      minutesRemaining: Math.max(0, limit - newUsed),
      minutesLimit: limit,
    };
  },
);
