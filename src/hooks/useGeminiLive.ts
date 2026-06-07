import { useCallback, useEffect, useRef, useState } from 'react';
import {
  INPUT_SAMPLE_RATE,
  OUTPUT_SAMPLE_RATE,
  PcmPlaybackQueue,
  base64ToInt16,
  downsampleBuffer,
  floatTo16BitPCM,
  int16ToBase64,
} from '../utils/liveAudio';
import { requestLiveSession, reportLiveSessionEnd, liveSessionErrorMessage } from '../services/liveSessionService';
import type { LunaUser, ChatMessage } from '../types/user';

export type LiveSessionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'speaking'
  | 'error';

export interface LiveTranscriptLine {
  role: 'user' | 'assistant';
  text: string;
}

const WS_BASE =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';

interface UseGeminiLiveOptions {
  language: 'en' | 'it';
  user: LunaUser;
  onSessionEnded?: (result: {
    durationSeconds: number;
    billedMinutes: number;
    chatHistory?: ChatMessage[];
    liveSessionId?: string;
    historySaved?: boolean;
  }) => void;
}

async function readWsPayload(data: unknown): Promise<string> {
  if (typeof data === 'string') return data;
  if (data instanceof Blob) return data.text();
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  return '';
}

function parseServerMessage(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractServerError(data: Record<string, unknown>): string | null {
  const err = data.error as { message?: string } | string | undefined;
  if (typeof err === 'string' && err) return err;
  if (err && typeof err === 'object' && err.message) return err.message;
  return null;
}

/** Matches @google/genai liveConnectParametersToMldev wire format. */
function buildSetupMessage(model: string, constrainedToken: boolean): Record<string, unknown> {
  if (constrainedToken) {
    // Config locked in ephemeral token — only model is required on the wire.
    return {
      setup: {
        model: model.startsWith('models/') ? model : `models/${model}`,
      },
    };
  }
  return {
    setup: {
      model: model.startsWith('models/') ? model : `models/${model}`,
      generationConfig: {
        responseModalities: ['AUDIO'],
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
  };
}

export function useGeminiLive({ language, user, onSessionEnded }: UseGeminiLiveOptions) {
  const [status, setStatus] = useState<LiveSessionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<LiveTranscriptLine[]>([]);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);
  const [playbackStream, setPlaybackStream] = useState<MediaStream | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackRef = useRef<PcmPlaybackQueue | null>(null);
  const transcriptRef = useRef<LiveTranscriptLine[]>([]);
  const sessionStartRef = useRef<number | null>(null);
  const sessionStartedIsoRef = useRef<string | null>(null);
  const setupCompleteRef = useRef(false);
  const micStartedRef = useRef(false);
  const stoppingRef = useRef(false);
  const maxSessionSecondsRef = useRef(600);
  const timerRef = useRef<number | null>(null);
  const onSessionEndedRef = useRef(onSessionEnded);

  useEffect(() => {
    onSessionEndedRef.current = onSessionEnded;
  }, [onSessionEnded]);

  const appendTranscript = useCallback((role: 'user' | 'assistant', text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTranscript((prev) => {
      const last = prev[prev.length - 1];
      let next: LiveTranscriptLine[];
      if (last?.role === role) {
        next = [...prev.slice(0, -1), { role, text: `${last.text} ${trimmed}`.trim() }];
      } else {
        next = [...prev, { role, text: trimmed }];
      }
      transcriptRef.current = next;
      return next;
    });
  }, []);

  const cleanupMedia = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    if (audioContextRef.current?.state !== 'closed') {
      void audioContextRef.current?.close();
    }
    audioContextRef.current = null;
    playbackRef.current = null;
    setPlaybackStream(null);
    micStartedRef.current = false;
  }, []);

  const stopSession = useCallback(async () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;

    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }

    cleanupMedia();
    setupCompleteRef.current = false;

    const started = sessionStartRef.current;
    sessionStartRef.current = null;
    const startedIso = sessionStartedIsoRef.current;
    sessionStartedIsoRef.current = null;
    const savedTranscript = transcriptRef.current;
    transcriptRef.current = [];
    setTranscript([]);
    setStatus('idle');

    if (started) {
      const durationSeconds = Math.round((Date.now() - started) / 1000);
      try {
        const result = await reportLiveSessionEnd(user, durationSeconds, {
          transcript: savedTranscript,
          language,
          sessionStartedAt: startedIso ?? undefined,
        });
        setMinutesRemaining(result.minutesRemaining);
        onSessionEndedRef.current?.({
          durationSeconds,
          billedMinutes: result.billedMinutes,
          chatHistory: result.chatHistory,
          liveSessionId: result.liveSessionId,
          historySaved: result.historySaved,
        });
      } catch (err) {
        console.error('endLiveSession failed', err);
        const billedMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
        onSessionEndedRef.current?.({ durationSeconds, billedMinutes });
      }
    }

    stoppingRef.current = false;
  }, [cleanupMedia, language, user]);

  const handleServerMessage = useCallback((data: Record<string, unknown>) => {
    const serverContent = data.serverContent as Record<string, unknown> | undefined;
    if (!serverContent) return;

    const inputTx = serverContent.inputTranscription as { text?: string } | undefined;
    if (inputTx?.text) {
      appendTranscript('user', inputTx.text);
      setStatus('listening');
    }

    const outputTx = serverContent.outputTranscription as { text?: string } | undefined;
    if (outputTx?.text) {
      appendTranscript('assistant', outputTx.text);
    }

    const modelTurn = serverContent.modelTurn as {
      parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }>;
    } | undefined;
    if (modelTurn?.parts) {
      for (const part of modelTurn.parts) {
        const inline = part.inlineData;
        if (inline?.data && playbackRef.current) {
          setStatus('speaking');
          const pcm = base64ToInt16(inline.data);
          playbackRef.current.enqueuePcm16(pcm, OUTPUT_SAMPLE_RATE);
        }
      }
    }

    if (serverContent.turnComplete) {
      setStatus('listening');
    }
  }, [appendTranscript]);

  const startMicStreaming = useCallback(async (ws: WebSocket) => {
    if (micStartedRef.current) return;
    micStartedRef.current = true;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    mediaStreamRef.current = stream;

    const ctx = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
    audioContextRef.current = ctx;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    playbackRef.current = new PcmPlaybackQueue(ctx);
    setPlaybackStream(playbackRef.current.getOutputStream());

    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (event) => {
      if (!setupCompleteRef.current || ws.readyState !== WebSocket.OPEN) return;
      const input = event.inputBuffer.getChannelData(0);
      const downsampled = downsampleBuffer(input, ctx.sampleRate, INPUT_SAMPLE_RATE);
      const pcm = floatTo16BitPCM(downsampled);
      if (pcm.length === 0) return;
      const payload = {
        realtimeInput: {
          audio: {
            data: int16ToBase64(pcm),
            mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
          },
        },
      };
      ws.send(JSON.stringify(payload));
    };

    const silent = ctx.createGain();
    silent.gain.value = 0;
    source.connect(processor);
    processor.connect(silent);
    silent.connect(ctx.destination);
    setStatus('listening');
  }, []);

  const startSession = useCallback(async () => {
    setError(null);
    setTranscript([]);
    transcriptRef.current = [];
    setSessionSeconds(0);
    setStatus('connecting');
    setupCompleteRef.current = false;
    micStartedRef.current = false;

    try {
      const session = await requestLiveSession(user, language);
      setMinutesRemaining(session.minutesRemaining);
      maxSessionSecondsRef.current = session.maxSessionSeconds;

      const token = session.token.startsWith('auth_tokens/')
        ? session.token
        : session.token;
      const wsUrl = `${WS_BASE}?access_token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const beginMic = async () => {
        try {
          await startMicStreaming(ws);
        } catch {
          setError(
            language === 'en'
              ? 'Microphone access denied or unavailable.'
              : 'Accesso al microfono negato o non disponibile.',
          );
          setStatus('error');
          void stopSession();
        }
      };

      ws.onopen = () => {
        const setup = buildSetupMessage(session.model, token.startsWith('auth_tokens/'));
        ws.send(JSON.stringify(setup));
      };

      ws.onmessage = (event) => {
        void (async () => {
          const text = await readWsPayload(event.data);
          if (!text) return;
          const parsed = parseServerMessage(text);
          if (!parsed) return;

          const serverErr = extractServerError(parsed);
          if (serverErr) {
            setError(serverErr);
            setStatus('error');
            void stopSession();
            return;
          }

          if (parsed.setupComplete != null) {
            setupCompleteRef.current = true;
            const startedAt = Date.now();
            sessionStartRef.current = startedAt;
            sessionStartedIsoRef.current = new Date(startedAt).toISOString();
            setStatus('connected');

            if (timerRef.current !== null) {
              window.clearInterval(timerRef.current);
            }
            timerRef.current = window.setInterval(() => {
              const started = sessionStartRef.current;
              if (!started) return;
              const elapsed = Math.floor((Date.now() - started) / 1000);
              setSessionSeconds(elapsed);
              if (elapsed >= maxSessionSecondsRef.current) {
                void stopSession();
              }
            }, 1000);

            await beginMic();
            return;
          }

          handleServerMessage(parsed);
        })();
      };

      ws.onerror = () => {
        setError(
          language === 'en'
            ? 'Live connection error.'
            : 'Errore connessione live.',
        );
        setStatus('error');
      };

      ws.onclose = (ev) => {
        if (!stoppingRef.current && !setupCompleteRef.current) {
          setError(
            language === 'en'
              ? `Live session closed before ready (code ${ev.code}).`
              : `Sessione live chiusa prima di essere pronta (codice ${ev.code}).`,
          );
          setStatus('error');
          cleanupMedia();
          wsRef.current = null;
          return;
        }
        if (sessionStartRef.current) {
          void stopSession();
        }
      };
    } catch (err) {
      setError(liveSessionErrorMessage(err, language));
      setStatus('error');
    }
  }, [cleanupMedia, handleServerMessage, language, startMicStreaming, stopSession, user]);

  useEffect(() => {
    return () => {
      void stopSession();
    };
  }, [stopSession]);

  return {
    status,
    error,
    transcript,
    sessionSeconds,
    minutesRemaining,
    startSession,
    stopSession,
    isActive: status !== 'idle' && status !== 'error',
    playbackStream,
  };
};
