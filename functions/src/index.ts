import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { buildLiveSystemPrompt } from './tutorPrompt';
import {
  MAX_LIVE_SESSION_MINUTES,
  monthlyLimit,
  normalizeLiveUsage,
} from './liveLimits';
import { createLiveSessionToken } from './liveToken';
import {
  type ChatMessageDoc,
  isPremiumHistoryExpired,
  mergeLiveTranscriptIntoChatHistory,
  removeLiveSessionFromChatHistory,
  stripAllLiveHistory,
} from './chatHistory';

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
  premiumEndedAt?: string | null;
  chatHistory?: ChatMessageDoc[];
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

    const language = request.data?.language === 'en' ? 'en' : 'it';
    const clientPrompt = typeof request.data?.systemPrompt === 'string'
      ? request.data.systemPrompt.trim()
      : '';
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

    const systemInstruction = clientPrompt || buildLiveSystemPrompt(
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
    const tier = user.tier === 'premium' ? 'premium' : 'free';
    const limit = monthlyLimit(tier);
    const { used, period } = normalizeLiveUsage(user.liveMinutesUsed, user.liveMinutesPeriod);
    const newUsed = Math.min(limit, used + billedMinutes);

    const existingHistory = user.chatHistory ?? [];
    let liveSessionId: string | null = null;
    let chatHistory = existingHistory;

    if (tier === 'premium' && transcript.length > 0) {
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
      liveMinutesPeriod: period,
      ...(tier === 'premium' && liveSessionId ? { chatHistory } : {}),
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
      chatHistory: tier === 'premium' && liveSessionId ? chatHistory : undefined,
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
    if (user.tier !== 'premium') {
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
