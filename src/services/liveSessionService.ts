import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { getFirebaseApp } from '../lib/firebase';
import { authHeaders } from './authHeaders';
import { buildLiveSystemPrompt } from './livePrompt';
import { updateUserProfile } from './userService';
import type { ChatMessage, LunaUser } from '../types/user';
import {
  liveMinutesLimitForUser,
  liveMinutesRemaining,
  MAX_LIVE_SESSION_MINUTES,
  normalizeWeeklyAiUsage,
  hasPremiumAccess,
  canUseAiTutor,
} from '../types/user';
import { mergeLiveTranscriptIntoChatHistory } from '../utils/chatHistory';

export interface CreateLiveSessionResult {
  token: string;
  model: string;
  maxSessionSeconds: number;
  minutesRemaining: number;
  minutesLimit: number;
  minutesUsed: number;
}

export interface EndLiveSessionResult {
  billedMinutes: number;
  minutesUsed: number;
  minutesRemaining: number;
  minutesLimit: number;
  liveSessionId?: string;
  chatHistory?: ChatMessage[];
  /** False when callable failed and transcript was not persisted server-side. */
  historySaved?: boolean;
}

export interface LiveTranscriptLine {
  role: 'user' | 'assistant';
  text: string;
}

class LiveSessionApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'LiveSessionApiError';
    this.status = status;
  }
}

let functionsInstance: ReturnType<typeof getFunctions> | null = null;
let emulatorConnected = false;

function getFunctionsInstance() {
  if (!functionsInstance) {
    functionsInstance = getFunctions(getFirebaseApp(), 'europe-west1');
    if (import.meta.env.DEV && import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === 'true' && !emulatorConnected) {
      connectFunctionsEmulator(functionsInstance, 'localhost', 5001);
      emulatorConnected = true;
    }
  }
  return functionsInstance;
}

function sessionQuota(user: LunaUser): Pick<CreateLiveSessionResult, 'maxSessionSeconds' | 'minutesRemaining' | 'minutesLimit' | 'minutesUsed'> {
  const limit = liveMinutesLimitForUser();
  const { used } = normalizeWeeklyAiUsage(user.liveMinutesUsed, user.liveMinutesWindowStart);
  const minutesRemaining = liveMinutesRemaining(user);
  const maxSessionSeconds = Math.min(
    MAX_LIVE_SESSION_MINUTES * 60,
    Math.floor(minutesRemaining * 60),
  );
  return { maxSessionSeconds, minutesRemaining, minutesLimit: limit, minutesUsed: used };
}

/** When local PHP/Node API fails, Firebase callable is the reliable fallback (auth + quota server-side). */
function shouldFallbackFromPhp(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof LiveSessionApiError) {
    return err.status === 401 || err.status === 500 || err.status === 502 || err.status === 503 || err.status === 504;
  }
  if (err instanceof Error) {
    return /failed to fetch|network|ECONNREFUSED|ECONNRESET|Live session API failed \(50/i.test(err.message);
  }
  return false;
}

async function requestLiveSessionViaPhp(
  user: LunaUser,
  language: 'en' | 'it',
): Promise<Pick<CreateLiveSessionResult, 'token' | 'model'>> {
  const systemPrompt = buildLiveSystemPrompt(user, language, user.chatHistory ?? []);
  const response = await fetch('/api/live-session.php', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ systemPrompt, language }),
  });

  const data = await response.json().catch(() => ({})) as { token?: string; model?: string; error?: string };

  if (!response.ok || !data.token || !data.model) {
    throw new LiveSessionApiError(
      data.error || `Live session API failed (${response.status})`,
      response.status,
    );
  }

  return { token: data.token, model: data.model };
}

async function requestLiveSessionViaFirebase(
  user: LunaUser,
  language: 'en' | 'it',
): Promise<CreateLiveSessionResult> {
  const fn = httpsCallable<
    { language: 'en' | 'it'; systemPrompt: string },
    CreateLiveSessionResult
  >(
    getFunctionsInstance(),
    'createLiveSession',
  );
  const systemPrompt = buildLiveSystemPrompt(user, language, user.chatHistory ?? []);
  const result = await fn({ language, systemPrompt });
  return result.data;
}

export async function requestLiveSession(user: LunaUser, language: 'en' | 'it'): Promise<CreateLiveSessionResult> {
  if (!canUseAiTutor(user)) {
    throw Object.assign(
      new Error('AI tutor and Luna Live require an active trial or subscription.'),
      { code: 'functions/permission-denied' },
    );
  }

  const quota = sessionQuota(user);

  if (quota.maxSessionSeconds < 30) {
    throw Object.assign(new Error('Not enough live minutes remaining.'), { code: 'functions/resource-exhausted' });
  }

  const useEmulator = import.meta.env.DEV && import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === 'true';

  if (!useEmulator) {
    try {
      const php = await requestLiveSessionViaPhp(user, language);
      return { ...php, ...quota };
    } catch (phpErr) {
      if (!shouldFallbackFromPhp(phpErr)) {
        throw phpErr;
      }
      console.warn('live-session.php unavailable or errored, trying Firebase callable', phpErr);
    }
  }

  return requestLiveSessionViaFirebase(user, language);
}

export function computeBilledMinutes(durationSeconds: number): number {
  const cappedSeconds = Math.min(Math.round(durationSeconds), MAX_LIVE_SESSION_MINUTES * 60);
  return Math.max(1, Math.ceil(cappedSeconds / 60));
}

async function persistLiveTranscriptClientSide(
  user: LunaUser,
  transcript: LiveTranscriptLine[],
  language: 'en' | 'it',
  sessionStartedAt?: string,
  liveSessionId?: string,
): Promise<{ chatHistory: ChatMessage[]; liveSessionId: string } | null> {
  if (!hasPremiumAccess(user) || transcript.length === 0) return null;

  const sessionId = liveSessionId ?? `live-${Date.now()}`;
  const startedAt = sessionStartedAt ? new Date(sessionStartedAt) : new Date();
  const chatHistory = mergeLiveTranscriptIntoChatHistory(
    user.chatHistory ?? [],
    sessionId,
    transcript,
    language,
    startedAt,
  );

  await updateUserProfile(user.id, { chatHistory });
  return { chatHistory, liveSessionId: sessionId };
}

export async function reportLiveSessionEnd(
  user: LunaUser,
  durationSeconds: number,
  options?: {
    transcript?: LiveTranscriptLine[];
    language?: 'en' | 'it';
    sessionStartedAt?: string;
  },
): Promise<EndLiveSessionResult> {
  const billedMinutes = computeBilledMinutes(durationSeconds);
  const limit = liveMinutesLimitForUser();
  const { used } = normalizeWeeklyAiUsage(user.liveMinutesUsed, user.liveMinutesWindowStart);
  const newUsed = Math.min(limit, used + billedMinutes);
  const language = options?.language ?? 'it';
  const transcript = hasPremiumAccess(user) ? options?.transcript ?? [] : [];

  try {
    const fn = httpsCallable<
      {
        durationSeconds: number;
        transcript?: LiveTranscriptLine[];
        language: 'en' | 'it';
        sessionStartedAt?: string;
      },
      EndLiveSessionResult
    >(
      getFunctionsInstance(),
      'endLiveSession',
    );
    const result = await fn({
      durationSeconds,
      transcript,
      language,
      sessionStartedAt: options?.sessionStartedAt,
    });

    const serverSaved = result.data.historySaved ?? Boolean(result.data.chatHistory?.length);
    if (serverSaved) {
      return { ...result.data, historySaved: true };
    }

    const clientSaved = await persistLiveTranscriptClientSide(
      user,
      transcript,
      language,
      options?.sessionStartedAt,
      result.data.liveSessionId,
    );
    if (clientSaved) {
      return {
        ...result.data,
        chatHistory: clientSaved.chatHistory,
        liveSessionId: clientSaved.liveSessionId,
        historySaved: true,
      };
    }

    return { ...result.data, historySaved: false };
  } catch (err) {
    console.warn('endLiveSession callable failed, trying client-side history save', err);

    if (hasPremiumAccess(user) && transcript.length > 0) {
      try {
        const clientSaved = await persistLiveTranscriptClientSide(
          user,
          transcript,
          language,
          options?.sessionStartedAt,
        );
        if (clientSaved) {
          return {
            billedMinutes,
            minutesUsed: newUsed,
            minutesRemaining: Math.max(0, limit - newUsed),
            minutesLimit: limit,
            chatHistory: clientSaved.chatHistory,
            liveSessionId: clientSaved.liveSessionId,
            historySaved: true,
          };
        }
      } catch (saveErr) {
        console.warn('Client live history save failed', saveErr);
      }
    }

    return {
      billedMinutes,
      minutesUsed: newUsed,
      minutesRemaining: Math.max(0, limit - newUsed),
      minutesLimit: limit,
      historySaved: false,
    };
  }
}

export async function deleteLiveSessionRecord(
  liveSessionId: string,
): Promise<{ chatHistory: ChatMessage[] }> {
  try {
    const fn = httpsCallable<{ liveSessionId: string }, { chatHistory: ChatMessage[] }>(
      getFunctionsInstance(),
      'deleteLiveSession',
    );
    const result = await fn({ liveSessionId });
    return result.data;
  } catch (err) {
    const code = typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: string }).code)
      : '';
    if (code.includes('unavailable') || code.includes('internal') || code.includes('not-found')) {
      throw Object.assign(new Error('DELETE_SERVICE_UNAVAILABLE'), { cause: err });
    }
    throw err;
  }
}

export function liveSessionErrorMessage(err: unknown, language: 'en' | 'it'): string {
  const code = typeof err === 'object' && err !== null && 'code' in err
    ? String((err as { code: string }).code)
    : '';
  const message = typeof err === 'object' && err !== null && 'message' in err
    ? String((err as { message: string }).message)
    : '';
  const details = typeof err === 'object' && err !== null && 'details' in err
    ? (err as { details: unknown }).details
    : undefined;
  const detailText = typeof details === 'string' ? details : '';

  if (code.includes('permission-denied')) {
    return message || (language === 'en'
      ? 'Luna Live requires an active trial or Premium subscription.'
      : 'Luna Live richiede prova attiva o abbonamento Premium.');
  }
  if (code.includes('resource-exhausted')) {
    return language === 'en'
      ? message || 'Live minutes limit reached for this week.'
      : message || 'Limite minuti live della settimana raggiunto.';
  }
  if (code.includes('unauthenticated')) {
    return language === 'en' ? 'Please log in to use Luna Live.' : 'Accedi per usare Luna Live.';
  }
  if (code.includes('failed-precondition')) {
    return message || detailText || (language === 'en'
      ? 'Live session could not start. Check GEMINI_API_KEY on the server.'
      : 'Impossibile avviare la sessione live. Verifica GEMINI_API_KEY sul server.');
  }
  if (code.includes('functions/unavailable') || code.includes('unavailable')) {
    return language === 'en'
      ? 'Live service unreachable. Check network or API configuration.'
      : 'Servizio live non raggiungibile. Controlla rete o configurazione API.';
  }
  if (code.includes('internal') || message === 'internal') {
    return language === 'en'
      ? 'Live service unavailable (Firebase Functions). Local dev: run npm run dev:all with GEMINI_API_KEY in .env.'
      : 'Servizio live non disponibile (Firebase Functions). In locale: npm run dev:all con GEMINI_API_KEY in .env.';
  }
  if (message.includes('Live session API failed (502)')) {
    return language === 'en'
      ? 'Local live API not running. Start the full dev stack: npm run dev:all (API on port 8080).'
      : 'API live locale non avviata. Avvia lo stack completo: npm run dev:all (API sulla porta 8080).';
  }
  if (message && message !== 'internal') {
    return message;
  }
  if (code.includes('not-found')) {
    return language === 'en'
      ? 'User profile not found. Log out and sign in again.'
      : 'Profilo utente non trovato. Esci e accedi di nuovo.';
  }
  return message || detailText || (language === 'en' ? 'Could not start live session.' : 'Impossibile avviare la sessione live.');
}
