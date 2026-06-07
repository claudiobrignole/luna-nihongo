import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  MAX_LIVE_SESSION_MINUTES,
  weeklyAiLimit,
  normalizeWeeklyAiUsage,
} from './liveLimits';
import { createLiveSessionToken } from './liveToken';
import {
  type ChatMessageDoc,
  isPremiumHistoryExpired,
  mergeLiveTranscriptIntoChatHistory,
  removeLiveSessionFromChatHistory,
  stripAllLiveHistory,
} from './chatHistory';
import { hasPremiumAccess } from './access';

initializeApp();

const geminiApiKey = defineSecret('GEMINI_API_KEY');

interface UserDoc {
  username?: string;
  role?: string;
  xp?: number;
  completedUnits?: string[];
  preferredStartLevel?: number;
  memory?: string;
  tier?: 'free' | 'premium';
  liveMinutesUsed?: number;
  liveMinutesWindowStart?: string | null;
  liveMinutesPeriod?: string;
  subscriptionStatus?: string | null;
  chatHistory?: ChatMessageDoc[];
  premiumEndedAt?: string | null;
  trialEndsAt?: string | null;
  trialUsed?: boolean;
}

function asTranscript(raw: unknown): Array<{ role: 'user' | 'assistant'; text: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((line) => {
      if (!line || typeof line !== 'object') return null;
      const role = (line as { role?: string }).role;
      const text = (line as { text?: string }).text ?? (line as { content?: string }).content;
      if ((role !== 'user' && role !== 'assistant') || typeof text !== 'string') return null;
      return { role, text };
    })
    .filter((line): line is { role: 'user' | 'assistant'; text: string } => line !== null);
}

export const createLiveSession = onCall(
  {
    secrets: [geminiApiKey],
    region: 'europe-west1',
    timeoutSeconds: 30,
    invoker: 'public',
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Login required for Luna Live.');
    }

    const clientPrompt = typeof request.data?.systemPrompt === 'string'
      ? request.data.systemPrompt.trim()
      : '';
    if (!clientPrompt) {
      throw new HttpsError(
        'invalid-argument',
        'systemPrompt is required. Client must send the full live prompt.',
      );
    }
    const uid = request.auth.uid;
    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      throw new HttpsError('not-found', 'User profile not found.');
    }

    const user = snap.data() as UserDoc;
    if (!hasPremiumAccess(user)) {
      throw new HttpsError(
        'permission-denied',
        'AI tutor and Luna Live require an active trial or subscription.',
      );
    }

    const limit = weeklyAiLimit('premium');
    const { used, windowStart, reset } = normalizeWeeklyAiUsage(
      user.liveMinutesUsed,
      user.liveMinutesWindowStart,
    );

    if (used >= limit) {
      throw new HttpsError(
        'resource-exhausted',
        'Weekly AI time limit reached (2 hours). Unused minutes do not roll over.',
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

    const systemInstruction = clientPrompt;

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
      throw new HttpsError('failed-precondition', detail);
    }

    if (reset || !user.liveMinutesWindowStart) {
      await userRef.update({
        liveMinutesWindowStart: windowStart,
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
    timeoutSeconds: 60,
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

    const language = request.data?.language === 'en' ? 'en' : 'it';
    const transcript = asTranscript(request.data?.transcript);
    const sessionStartedAtRaw = request.data?.sessionStartedAt;
    const sessionStartedAt = typeof sessionStartedAtRaw === 'string'
      ? new Date(sessionStartedAtRaw)
      : new Date(Date.now() - durationSeconds * 1000);

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
    const limit = weeklyAiLimit('premium');
    const { used, windowStart, reset } = normalizeWeeklyAiUsage(
      user.liveMinutesUsed,
      user.liveMinutesWindowStart,
    );
    const baseUsed = reset ? 0 : used;
    const newUsed = Math.min(limit, baseUsed + billedMinutes);

    const existingHistory = user.chatHistory ?? [];
    let liveSessionId: string | null = null;
    let chatHistory = existingHistory;

    if (hasPremiumAccess(user) && transcript.length > 0) {
      liveSessionId = db.collection('users').doc(uid).collection('liveSessions').doc().id;
      chatHistory = mergeLiveTranscriptIntoChatHistory(
        existingHistory,
        liveSessionId,
        transcript,
        language,
        sessionStartedAt,
      );
    }

    await userRef.update({
      liveMinutesUsed: newUsed,
      liveMinutesWindowStart: reset || !user.liveMinutesWindowStart ? windowStart : user.liveMinutesWindowStart,
      ...(hasPremiumAccess(user) && liveSessionId ? { chatHistory } : {}),
      updatedAt: new Date().toISOString(),
    });

    if (liveSessionId) {
      await userRef.collection('liveSessions').doc(liveSessionId).set({
        durationSeconds: cappedSeconds,
        billedMinutes,
        transcript,
        messageCount: transcript.length,
        language,
        createdAt: FieldValue.serverTimestamp(),
        sessionStartedAt: sessionStartedAt.toISOString(),
      });
    } else {
      await userRef.collection('liveSessions').add({
        durationSeconds: cappedSeconds,
        billedMinutes,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return {
      billedMinutes,
      minutesUsed: newUsed,
      minutesRemaining: Math.max(0, limit - newUsed),
      minutesLimit: limit,
      liveSessionId: liveSessionId ?? undefined,
      chatHistory: hasPremiumAccess(user) && liveSessionId ? chatHistory : undefined,
      historySaved: Boolean(hasPremiumAccess(user) && liveSessionId),
    };
  },
);

export const deleteLiveSession = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 30,
    invoker: 'public',
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Login required.');
    }

    const liveSessionId = typeof request.data?.liveSessionId === 'string'
      ? request.data.liveSessionId.trim()
      : '';
    if (!liveSessionId) {
      throw new HttpsError('invalid-argument', 'Missing liveSessionId.');
    }

    const uid = request.auth.uid;
    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      throw new HttpsError('not-found', 'User profile not found.');
    }

    const user = snap.data() as UserDoc;
    if (!hasPremiumAccess(user)) {
      throw new HttpsError('permission-denied', 'Premium required to manage live history.');
    }

    const chatHistory = removeLiveSessionFromChatHistory(user.chatHistory ?? [], liveSessionId);

    await userRef.update({
      chatHistory,
      updatedAt: new Date().toISOString(),
    });

    await userRef.collection('liveSessions').doc(liveSessionId).delete().catch(() => undefined);

    return { chatHistory, liveSessionId };
  },
);

export const purgeExpiredLiveHistory = onSchedule(
  {
    schedule: 'every day 03:00',
    region: 'europe-west1',
    timeZone: 'Europe/Zurich',
  },
  async () => {
    const db = getFirestore();
    const snap = await db.collection('users').where('premiumEndedAt', '!=', null).get();

    for (const userDoc of snap.docs) {
      const data = userDoc.data() as UserDoc;
      if (data.tier === 'premium') continue;
      if (!isPremiumHistoryExpired(data.premiumEndedAt)) continue;

      const chatHistory = stripAllLiveHistory(data.chatHistory ?? []);
      await userDoc.ref.update({
        chatHistory,
        premiumEndedAt: null,
        updatedAt: new Date().toISOString(),
      });

      const sessionsSnap = await userDoc.ref.collection('liveSessions').get();
      const batch = db.batch();
      sessionsSnap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  },
);

export { createStripeCheckout, createExtraLessonCheckout, createStripePortal, stripeWebhook } from './stripe';
export { startFreeTrial, bookAvailabilitySlot } from './scheduling';
export { adminDeleteUser } from './adminUsers';
