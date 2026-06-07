import React, { useMemo, useState } from 'react';
import { Search, Trash2, Radio, Lock, Calendar, ChevronRight } from 'lucide-react';
import type { ChatMessage, LunaUser } from '../types/user';
import { hasPremiumAccess } from '../types/user';
import {
  filterLiveSessions,
  getLiveSessionMessages,
  listLiveSessions,
} from '../utils/chatHistory';
import { deleteLiveSessionRecord } from '../services/liveSessionService';
import { PremiumUpgradeButton } from './PremiumUpgradeButton';

interface LiveHistoryPanelProps {
  language: 'en' | 'it';
  currentUser: LunaUser;
  chatHistory: ChatMessage[];
  onChatHistoryChange: (chatHistory: ChatMessage[]) => void;
  onNavigateToDashboard: () => void;
}

function formatListDate(iso: string, language: 'en' | 'it'): string {
  return new Date(iso).toLocaleString(language === 'en' ? 'en-GB' : 'it-IT', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const LiveHistoryPanel: React.FC<LiveHistoryPanelProps> = ({
  language,
  currentUser,
  chatHistory,
  onChatHistoryChange,
}) => {
  const isPremium = hasPremiumAccess(currentUser);
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [textQuery, setTextQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const allSessions = useMemo(() => listLiveSessions(chatHistory), [chatHistory]);

  const filteredSessions = useMemo(
    () =>
      filterLiveSessions(
        allSessions,
        {
          month: month || undefined,
          day: day ? Number(day) : undefined,
          text: textQuery,
        },
        chatHistory,
      ),
    [allSessions, chatHistory, day, month, textQuery],
  );

  const selectedMessages = selectedId
    ? getLiveSessionMessages(chatHistory, selectedId)
    : [];

  const handleDelete = async (liveSessionId: string) => {
    const confirmMsg =
      language === 'en'
        ? 'Delete this live conversation from history?'
        : 'Eliminare questa conversazione live dallo storico?';
    if (!window.confirm(confirmMsg)) return;

    setDeletingId(liveSessionId);
    try {
      const result = await deleteLiveSessionRecord(liveSessionId);
      onChatHistoryChange(result.chatHistory);
      if (selectedId === liveSessionId) setSelectedId(null);
    } catch (err) {
      console.error('deleteLiveSession failed', err);
      const msg =
        err instanceof Error && err.message === 'DELETE_SERVICE_UNAVAILABLE'
          ? language === 'en'
            ? 'Delete service unavailable. Deploy deleteLiveSession and allow public Cloud Run access.'
            : 'Servizio eliminazione non disponibile. Deploy deleteLiveSession e accesso pubblico Cloud Run.'
          : language === 'en'
            ? 'Could not delete session. Try again.'
            : 'Impossibile eliminare la sessione. Riprova.';
      alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="glass-panel live-history-panel">
      <div className="live-history-header">
        <Radio size={16} style={{ color: 'var(--secondary)' }} />
        <span>{language === 'en' ? 'Live history' : 'Storico live'}</span>
      </div>

      {!isPremium ? (
        <div className="live-history-locked">
          <Lock size={22} />
          <p>
            {language === 'en'
              ? 'Premium saves live transcripts and lets Luna remember your voice sessions.'
              : 'Premium salva le trascrizioni live e permette a Luna di ricordare le sessioni vocali.'}
          </p>
          <PremiumUpgradeButton language={language} className="btn btn-primary live-history-upgrade" />
        </div>
      ) : (
        <>
          <div className="live-history-filters">
            <label className="live-history-filter">
              <Calendar size={14} />
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                aria-label={language === 'en' ? 'Filter by month' : 'Filtra per mese'}
              />
            </label>
            <label className="live-history-filter">
              <span>{language === 'en' ? 'Day' : 'Giorno'}</span>
              <input
                type="number"
                min={1}
                max={31}
                placeholder="—"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                aria-label={language === 'en' ? 'Filter by day' : 'Filtra per giorno'}
              />
            </label>
          </div>

          <label className="live-history-search">
            <Search size={14} />
            <input
              type="search"
              value={textQuery}
              onChange={(e) => setTextQuery(e.target.value)}
              placeholder={
                language === 'en'
                  ? 'Search in transcripts…'
                  : 'Cerca nelle trascrizioni…'
              }
            />
          </label>

          <div className="live-history-list">
            {filteredSessions.length === 0 ? (
              <p className="live-history-empty">
                {language === 'en'
                  ? 'No saved live sessions yet.'
                  : 'Nessuna sessione live salvata.'}
              </p>
            ) : (
              filteredSessions.map((session) => (
                <div key={session.id} className="live-history-item-wrap">
                  <button
                    type="button"
                    className={`live-history-item ${selectedId === session.id ? 'active' : ''}`}
                    onClick={() => setSelectedId(session.id === selectedId ? null : session.id)}
                  >
                    <div>
                      <strong>{formatListDate(session.startedAt, language)}</strong>
                      <span>{session.messageCount} {language === 'en' ? 'lines' : 'righe'}</span>
                    </div>
                    <ChevronRight size={14} />
                  </button>
                  <button
                    type="button"
                    className="live-history-delete"
                    disabled={deletingId === session.id}
                    onClick={() => void handleDelete(session.id)}
                    title={language === 'en' ? 'Delete session' : 'Elimina sessione'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {selectedId && selectedMessages.length > 0 && (
            <div className="live-history-detail">
              <h4>{language === 'en' ? 'Transcript' : 'Trascrizione'}</h4>
              <ul>
                {selectedMessages.map((line, i) => (
                  <li key={`${selectedId}-${i}`} className={`live-line ${line.role}`}>
                    <strong>{line.role === 'user' ? (language === 'en' ? 'You' : 'Tu') : 'Luna'}:</strong>{' '}
                    {line.content}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};
