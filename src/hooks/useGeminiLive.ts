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
import type { LunaUser } from '../types/user';

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
  onSessionEnded?: (result: { durationSeconds: number; billedMinutes: number }) => void;
}

function parseServerMessage(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function useGeminiLive({ language, user, onSessionEnded }: UseGeminiLiveOptions) {
  const [status, setStatus] = useState<LiveSessionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<LiveTranscriptLine[]>([]);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackRef = useRef<PcmPlaybackQueue | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  const maxSessionSecondsRef = useRef(600);
  const timerRef = useRef<number | null>(null);
  const onSessionEndedRef = useRef(onSessionEnded);
  onSessionEndedRef.current = onSessionEnded;

  const appendTranscript = useCallback((role: 'user' | 'assistant', text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTranscript((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === role) {
        return [...prev.slice(0, -1), { role, text: `${last.text} ${trimmed}`.trim() }];
      }
      return [...prev, { role, text: trimmed }];
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
  }, []);

  const stopSession = useCallback(async () => {
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

    const started = sessionStartRef.current;
    sessionStartRef.current = null;
    setStatus('idle');

    if (started) {
      const durationSeconds = Math.round((Date.now() - started) / 1000);
      try {
        const result = await reportLiveSessionEnd(user, durationSeconds);
        setMinutesRemaining(result.minutesRemaining);
        onSessionEndedRef.current?.({
          durationSeconds,
          billedMinutes: result.billedMinutes,
        });
      } catch (err) {
        console.error('endLiveSession failed', err);
        const billedMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
        onSessionEndedRef.current?.({ durationSeconds, billedMinutes });
      }
    }
  }, [cleanupMedia, user]);

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

    const modelTurn = serverContent.modelTurn as { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } | undefined;
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
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    mediaStreamRef.current = stream;

    const ctx = new AudioContext();
    audioContextRef.current = ctx;
    playbackRef.current = new PcmPlaybackQueue(ctx);

    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (event) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const input = event.inputBuffer.getChannelData(0);
      const downsampled = downsampleBuffer(input, ctx.sampleRate, INPUT_SAMPLE_RATE);
      const pcm = floatTo16BitPCM(downsampled);
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

    source.connect(processor);
    processor.connect(ctx.destination);
    setStatus('listening');
  }, []);

  const startSession = useCallback(async () => {
    setError(null);
    setTranscript([]);
    setSessionSeconds(0);
    setStatus('connecting');

    try {
      const session = await requestLiveSession(user, language);
      setMinutesRemaining(session.minutesRemaining);
      maxSessionSecondsRef.current = session.maxSessionSeconds;

      const wsUrl = `${WS_BASE}?access_token=${encodeURIComponent(session.token)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        const setup = {
          config: {
            model: `models/${session.model}`,
            responseModalities: ['AUDIO'],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        };
        ws.send(JSON.stringify(setup));
        sessionStartRef.current = Date.now();
        setStatus('connected');

        timerRef.current = window.setInterval(() => {
          const started = sessionStartRef.current;
          if (!started) return;
          const elapsed = Math.floor((Date.now() - started) / 1000);
          setSessionSeconds(elapsed);
          if (elapsed >= maxSessionSecondsRef.current) {
            void stopSession();
          }
        }, 1000);

        try {
          await startMicStreaming(ws);
        } catch (micErr) {
          setError(
            language === 'en'
              ? 'Microphone access denied or unavailable.'
              : 'Accesso al microfono negato o non disponibile.',
          );
          setStatus('error');
          void stopSession();
        }
      };

      ws.onmessage = (event) => {
        const text = typeof event.data === 'string' ? event.data : '';
        if (!text) return;
        const parsed = parseServerMessage(text);
        if (parsed) handleServerMessage(parsed);
      };

      ws.onerror = () => {
        setError(
          language === 'en'
            ? 'Live connection error.'
            : 'Errore connessione live.',
        );
        setStatus('error');
      };

      ws.onclose = () => {
        if (sessionStartRef.current) {
          void stopSession();
        }
      };
    } catch (err) {
      setError(liveSessionErrorMessage(err, language));
      setStatus('error');
    }
  }, [handleServerMessage, language, startMicStreaming, stopSession, user]);

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
  };
}
