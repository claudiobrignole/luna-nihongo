import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Square, Loader2, AlertCircle, Crown, Radio, CheckCircle2,
} from 'lucide-react';
import type { ChatMessage, LunaUser } from '../types/user';
import {
  liveMinutesRemaining,
  MAX_LIVE_SESSION_MINUTES,
  AI_MINUTES_WEEKLY,
  canUseAiTutor,
} from '../types/user';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { PremiumUpgradeButton } from './PremiumUpgradeButton';
import { connectSimliAvatar, isSimliConfigured, type SimliSession } from '../services/simliAvatar';
import { LunaLogo } from './LunaLogo';

interface LunaLiveProps {
  language: 'en' | 'it';
  currentUser: LunaUser;
  onNavigateToDashboard: () => void;
  onSessionLogged?: (label: string, meta?: Record<string, string | number>) => void;
  onSessionSaved?: (chatHistory: ChatMessage[]) => void;
  onSessionActiveChange?: (active: boolean) => void;
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
  onSessionLogged,
  onSessionSaved,
  onSessionActiveChange,
}) => {
  const remaining = liveMinutesRemaining(currentUser);
  const isFree = !canUseAiTutor(currentUser);
  const noMinutesLeft = remaining <= 0;
  const [sessionNotice, setSessionNotice] = useState<'saved' | 'unsaved' | null>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const simliRef = useRef<SimliSession | null>(null);
  const simliEnabled = isSimliConfigured();

  const handleSessionEnded = useCallback(
    async ({
      durationSeconds,
      billedMinutes,
      chatHistory,
      historySaved,
    }: {
      durationSeconds: number;
      billedMinutes: number;
      chatHistory?: ChatMessage[];
      historySaved?: boolean;
    }) => {
      if (historySaved && chatHistory) {
        setSessionNotice('saved');
        onSessionSaved?.(chatHistory);
      } else if (historySaved === false) {
        setSessionNotice('unsaved');
      }

      onSessionLogged?.(
        language === 'en' ? `Live session ${formatTime(durationSeconds)}` : `Sessione live ${formatTime(durationSeconds)}`,
        { durationSeconds, billedMinutes },
      );
    },
    [currentUser.tier, language, onSessionLogged, onSessionSaved],
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
    playbackStream,
  } = useGeminiLive({ language, user: currentUser, onSessionEnded: handleSessionEnded });

  useEffect(() => {
    onSessionActiveChange?.(isActive);
  }, [isActive, onSessionActiveChange]);

  useEffect(() => {
    if (!isActive || !playbackStream || !simliEnabled) {
      return undefined;
    }

    const avatarEl = avatarRef.current;
    let cancelled = false;
    void connectSimliAvatar(playbackStream).then((session) => {
      if (cancelled || !session || !avatarEl) {
        session?.disconnect();
        return;
      }
      simliRef.current?.disconnect();
      simliRef.current = session;
      avatarEl.querySelector('.luna-simli-video')?.remove();
      avatarEl.prepend(session.videoElement);
    });

    return () => {
      cancelled = true;
      simliRef.current?.disconnect();
      simliRef.current = null;
      avatarEl?.querySelector('.luna-simli-video')?.remove();
    };
  }, [isActive, playbackStream, simliEnabled]);

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
        <div
          ref={avatarRef}
          className={`luna-avatar ${status === 'speaking' ? 'speaking' : ''} ${isActive ? 'active' : ''}`}
        >
          {!simliEnabled && <LunaLogo layout="icon" className="luna-logo--icon-live" alt="" />}
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
              onClick={() => {
                setSessionNotice(null);
                void startSession();
              }}
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

      {sessionNotice === 'saved' && (
        <div className="luna-live-banner success">
          <CheckCircle2 size={18} />
          <span>
            {language === 'en'
              ? 'Conversation saved to your live history.'
              : 'Conversazione salvata nello storico live.'}
          </span>
        </div>
      )}

      {sessionNotice === 'unsaved' && (
        <div className="luna-live-banner error">
          <AlertCircle size={18} />
          <span>
            {language === 'en'
              ? 'Could not save transcript. Check your connection and try again.'
              : 'Impossibile salvare la trascrizione. Controlla la connessione e riprova.'}
          </span>
        </div>
      )}

      {noMinutesLeft && !isActive && (
        <div className="luna-live-banner warn">
          <Crown size={18} />
          <div>
            <strong>
              {language === 'en'
                ? 'Weekly live minutes used'
                : 'Minuti live settimanali esauriti'}
            </strong>
            <p>
              {isFree
                ? language === 'en'
                  ? 'Start your 7-day trial or subscribe for Luna Live (2 h/week rolling).'
                  : 'Inizia la prova di 7 giorni o abbonati per Luna Live (2 h/settimana rolling).'
                : language === 'en'
                  ? `Your ${AI_MINUTES_WEEKLY / 60}-hour weekly quota resets 7 days after your first session in the window.`
                  : `La quota di ${AI_MINUTES_WEEKLY / 60} ore/settimana si azzera 7 giorni dopo la prima sessione della finestra.`}
            </p>
            {isFree && (
              <PremiumUpgradeButton
                language={language}
                className="luna-live-link-btn btn btn-primary"
              />
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
              ? 'Start a conversation and speak — your words and Luna\'s replies appear here.'
              : 'Avvia la conversazione e parla — qui vedrai le tue frasi e le risposte di Luna.'}
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
