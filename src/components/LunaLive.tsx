import React, { useCallback } from 'react';
import {
  Mic, MicOff, Square, Loader2, AlertCircle, Crown, Radio,
} from 'lucide-react';
import type { ChatMessage, LunaUser } from '../types/user';
import {
  liveMinutesLimit,
  liveMinutesRemaining,
  MAX_LIVE_SESSION_MINUTES,
  resolveLiveMinutesUsed,
  currentLiveMinutesPeriod,
} from '../types/user';
import { useGeminiLive } from '../hooks/useGeminiLive';

interface LunaLiveProps {
  language: 'en' | 'it';
  currentUser: LunaUser;
  onUserUpdate: (updates: Partial<LunaUser>) => Promise<void>;
  onNavigateToDashboard: () => void;
  onSessionLogged?: (label: string, meta?: Record<string, string | number>) => void;
  onChatHistoryUpdated?: (chatHistory: ChatMessage[], liveMinutesUsed: number) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function statusLabel(status: string, language: 'en' | 'it'): string {
  const labels: Record<string, { en: string; it: string }> = {
    idle: { en: 'Ready', it: 'Pronta' },
    connecting: { en: 'Connecting…', it: 'Connessione…' },
    connected: { en: 'Connected', it: 'Connessa' },
    listening: { en: 'Listening…', it: 'Ascolto…' },
    speaking: { en: 'Luna is speaking', it: 'Luna parla' },
    error: { en: 'Error', it: 'Errore' },
  };
  return labels[status]?.[language] ?? status;
}

export const LunaLive: React.FC<LunaLiveProps> = ({
  language,
  currentUser,
  onUserUpdate,
  onNavigateToDashboard,
  onSessionLogged,
  onChatHistoryUpdated,
}) => {
  const limit = liveMinutesLimit(currentUser.tier);
  const used = resolveLiveMinutesUsed(currentUser);
  const remaining = liveMinutesRemaining(currentUser);
  const isFree = currentUser.tier === 'free';
  const noMinutesLeft = remaining <= 0;

  const handleSessionEnded = useCallback(
    async ({
      durationSeconds,
      billedMinutes,
      chatHistory,
    }: {
      durationSeconds: number;
      billedMinutes: number;
      chatHistory?: ChatMessage[];
    }) => {
      const newUsed = Math.min(limit, used + billedMinutes);
      if (chatHistory) {
        onChatHistoryUpdated?.(chatHistory, newUsed);
      } else {
        await onUserUpdate({
          liveMinutesUsed: newUsed,
          liveMinutesPeriod: currentLiveMinutesPeriod(),
        });
      }
      onSessionLogged?.(
        language === 'en' ? `Live session ${formatTime(durationSeconds)}` : `Sessione live ${formatTime(durationSeconds)}`,
        { durationSeconds, billedMinutes },
      );
    },
    [language, limit, onChatHistoryUpdated, onSessionLogged, onUserUpdate, used],
  );

  const {
    status,
    error,
    transcript,
    sessionSeconds,
    minutesRemaining,
    startSession,
    stopSession,
    isActive,
  } = useGeminiLive({ language, user: currentUser, onSessionEnded: handleSessionEnded });

  const displayRemaining = minutesRemaining ?? remaining;

  return (
    <div className="luna-live">
      <header className="luna-live-header">
        <div>
          <h2>{language === 'en' ? 'Talk with Luna AI' : 'Parla con Luna AI'}</h2>
          <p>
            {language === 'en'
              ? 'Real-time voice conversation — speak freely, the AI corrects you and lets you hear the right pronunciation.'
              : 'Conversazione vocale in tempo reale — parla liberamente, la AI ti corregge e ti fa ascoltare la giusta pronuncia.'}
          </p>
        </div>
        <div className="luna-live-quota">
          <span>
            {language === 'en'
              ? `${displayRemaining} min left this month`
              : `${displayRemaining} min rimasti questo mese`}
          </span>
          <span className="luna-live-quota-sub">
            {language === 'en'
              ? `Max ${MAX_LIVE_SESSION_MINUTES} min per session`
              : `Max ${MAX_LIVE_SESSION_MINUTES} min per sessione`}
          </span>
        </div>
      </header>

      <div className="luna-live-stage">
        <div className={`luna-avatar ${status === 'speaking' ? 'speaking' : ''} ${isActive ? 'active' : ''}`}>
          <span className="luna-avatar-mark">月</span>
          <p className="luna-avatar-status">
            <Radio size={14} />
            {statusLabel(status, language)}
          </p>
        </div>

        <div className="luna-live-controls">
          {!isActive ? (
            <button
              type="button"
              className="luna-live-btn primary"
              disabled={noMinutesLeft || status === 'connecting'}
              onClick={() => void startSession()}
            >
              {status === 'connecting' ? (
                <Loader2 size={20} className="spin" />
              ) : (
                <Mic size={20} />
              )}
              {language === 'en' ? 'Start conversation' : 'Avvia conversazione'}
            </button>
          ) : (
            <button
              type="button"
              className="luna-live-btn danger"
              onClick={() => void stopSession()}
            >
              <Square size={20} fill="currentColor" />
              {language === 'en' ? 'End call' : 'Termina'} ({formatTime(sessionSeconds)})
            </button>
          )}
        </div>
      </div>

      {noMinutesLeft && !isActive && (
        <div className="luna-live-banner warn">
          <Crown size={18} />
          <div>
            <strong>
              {language === 'en'
                ? 'Monthly live minutes used'
                : 'Minuti live del mese esauriti'}
            </strong>
            <p>
              {isFree
                ? language === 'en'
                  ? `Free plan includes ${limit} min/month. Upgrade for ${liveMinutesLimit('premium')} min.`
                  : `Il piano Free include ${limit} min/mese. Passa a Premium per ${liveMinutesLimit('premium')} min.`
                : language === 'en'
                  ? 'Your monthly live quota resets next month.'
                  : 'La quota live si azzera il prossimo mese.'}
            </p>
            {isFree && (
              <button type="button" className="luna-live-link-btn" onClick={onNavigateToDashboard}>
                {language === 'en' ? 'Upgrade to Premium' : 'Passa a Premium'}
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="luna-live-banner error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="luna-live-transcript">
        <h3>{language === 'en' ? 'Live transcript' : 'Trascrizione live'}</h3>
        {transcript.length === 0 ? (
          <p className="luna-live-transcript-empty">
            {language === 'en'
              ? 'Start a call and speak — your words and Luna\'s replies appear here.'
              : 'Avvia la chiamata e parla — qui vedrai le tue frasi e le risposte di Luna.'}
          </p>
        ) : (
          <ul>
            {transcript.map((line, i) => (
              <li key={`${line.role}-${i}`} className={`live-line ${line.role}`}>
                <strong>{line.role === 'user' ? (language === 'en' ? 'You' : 'Tu') : 'Luna'}:</strong>{' '}
                {line.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="luna-live-hint">
        {isActive ? (
          <>
            <Mic size={14} />{' '}
            {language === 'en'
              ? 'Microphone is active. You can interrupt Luna while she speaks.'
              : 'Microfono attivo. Puoi interrompere Luna mentre parla.'}
          </>
        ) : (
          <>
            <MicOff size={14} />{' '}
            {language === 'en'
              ? 'Requires microphone permission. Speak after the status shows Listening.'
              : 'Richiede permesso microfono. Parla quando lo stato mostra Ascolto.'}
          </>
        )}
      </p>
    </div>
  );
};
