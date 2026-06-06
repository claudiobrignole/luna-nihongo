import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { GoogleGenAI, Modality } from '@google/genai';
import { defineSecret } from 'firebase-functions/params';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { buildLiveSystemPrompt } from './tutorPrompt';
import {
  LIVE_MODEL,
  MAX_LIVE_SESSION_MINUTES,
  monthlyLimit,
  normalizeLiveUsage,
} from './liveLimits';

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
    const client = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: 'v1alpha' },
    });

    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    let tokenName: string;
    try {
      const token = await client.authTokens.create({
        config: {
          expireTime,
          newSessionExpireTime,
          uses: 1,
          liveConnectConstraints: {
            model: LIVE_MODEL,
            config: {
              responseModalities: [Modality.AUDIO],
              systemInstruction: {
                parts: [{ text: systemInstruction }],
              },
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
              },
              contextWindowCompression: {
                slidingWindow: { targetTokens: '20000' },
              },
            },
          },
          httpOptions: { apiVersion: 'v1alpha' },
        },
      });
      tokenName = token.name ?? '';
    } catch (err) {
      console.error('authTokens.create failed', err);
      throw new HttpsError('internal', 'Could not create live session token.');
    }

    if (!tokenName) {
      throw new HttpsError('internal', 'Empty live session token.');
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
      model: LIVE_MODEL,
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
