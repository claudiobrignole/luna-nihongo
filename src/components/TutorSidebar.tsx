import React from 'react';
import { Zap, Crown, Brain, Lock } from 'lucide-react';
import type { LunaUser } from '../types/user';
import { FREE_TUTOR_TURN_LIMIT, liveMinutesRemaining } from '../types/user';

interface TutorSidebarProps {
  language: 'en' | 'it';
  currentUser: LunaUser;
  memoryText: string;
  isEditingMemory: boolean;
  onMemoryTextChange: (value: string) => void;
  onToggleEditMemory: () => void;
  onSaveMemory: () => void;
  onNavigateToDashboard: () => void;
  children?: React.ReactNode;
}

export const TutorSidebar: React.FC<TutorSidebarProps> = ({
  language,
  currentUser,
  memoryText,
  isEditingMemory,
  onMemoryTextChange,
  onToggleEditMemory,
  onSaveMemory,
  onNavigateToDashboard,
  children,
}) => {
  const isFree = currentUser.tier === 'free';
  const msgCount = currentUser.messagesCount || 0;
  const remaining = FREE_TUTOR_TURN_LIMIT - msgCount;
  const liveRemaining = liveMinutesRemaining(currentUser);

  return (
    <div className="tutor-sidebar">
      <div
        className="glass-panel"
        style={{
          padding: '1.2rem',
          background: currentUser.tier === 'premium'
            ? 'linear-gradient(135deg, rgba(155,89,182,0.12), rgba(155,89,182,0.04))'
            : 'var(--bg-panel)',
          borderColor: currentUser.tier === 'premium' ? 'rgba(155,89,182,0.3)' : 'var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          {currentUser.tier === 'premium' ? (
            <Crown size={18} style={{ color: 'var(--secondary)' }} />
          ) : (
            <Zap size={18} style={{ color: 'var(--primary)' }} />
          )}
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
            {currentUser.tier === 'premium' ? 'Premium' : 'Free Plan'}
          </span>
        </div>
        {isFree && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <strong style={{ color: remaining > 1 ? 'var(--success)' : 'var(--error)' }}>
              {Math.max(0, remaining)}
            </strong>{' '}
            {language === 'en' ? 'Q&A turns left (free)' : 'turni Q&A rimasti (free)'}
            <div
              style={{
                height: '4px',
                backgroundColor: 'var(--border)',
                borderRadius: '2px',
                marginTop: '0.5rem',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.max(0, (remaining / FREE_TUTOR_TURN_LIMIT)) * 100}%`,
                  backgroundColor: remaining > 2 ? 'var(--success)' : 'var(--error)',
                  borderRadius: '2px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        )}
        {currentUser.tier === 'premium' && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {language === 'en' ? 'Unlimited messages & full memory' : 'Messaggi illimitati e memoria completa'}
          </p>
        )}
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>
          {language === 'en'
            ? `${liveRemaining} live min left this month`
            : `${liveRemaining} min live rimasti questo mese`}
        </p>
      </div>

      {children}

      <div className="glass-panel" style={{ padding: '1.2rem', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
          <Brain size={16} style={{ color: 'var(--secondary)' }} />
          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
            {language === 'en' ? "Luna's Memory" : 'Memoria di Luna'}
          </span>
          {currentUser.tier === 'premium' && (
            <button
              type="button"
              onClick={onToggleEditMemory}
              style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}
            >
              {isEditingMemory
                ? language === 'en'
                  ? 'Cancel'
                  : 'Annulla'
                : language === 'en'
                  ? 'Edit'
                  : 'Modifica'}
            </button>
          )}
        </div>

        {currentUser.tier === 'free' ? (
          <div
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '1.5rem 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Lock size={28} style={{ color: 'var(--border)' }} />
            <span>
              {language === 'en'
                ? 'Long-term memory available in Premium'
                : 'Memoria disponibile nel piano Premium'}
            </span>
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem', marginTop: '0.5rem' }}
              onClick={onNavigateToDashboard}
            >
              {language === 'en' ? 'Upgrade' : 'Passa a Premium'}
            </button>
          </div>
        ) : isEditingMemory ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <textarea
              value={memoryText}
              onChange={(e) => onMemoryTextChange(e.target.value)}
              rows={6}
              style={{
                width: '100%',
                padding: '0.6rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-main)',
                fontSize: '0.8rem',
                resize: 'vertical',
                fontFamily: 'var(--font-body)',
              }}
            />
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: '0.8rem', padding: '0.4rem' }}
              onClick={onSaveMemory}
            >
              {language === 'en' ? 'Save' : 'Salva'}
            </button>
          </div>
        ) : (
          <p
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
            }}
          >
            {currentUser.memory ||
              (language === 'en' ? 'No notes yet. Start chatting!' : 'Nessuna nota. Inizia a chattare!')}
          </p>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '1.2rem' }}>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.6rem' }}>
          {language === 'en' ? 'Your Progress' : 'I tuoi Progressi'}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
          <span>✅ {language === 'en' ? 'Lessons' : 'Lezioni'}</span>
          <strong>{currentUser.completedUnits.length}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginTop: '0.3rem' }}>
          <span>⚡ XP</span>
          <strong>{currentUser.xp}</strong>
        </div>
      </div>
    </div>
  );
};
