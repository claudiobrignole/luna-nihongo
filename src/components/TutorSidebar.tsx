import React from 'react';
import { Zap, Crown, Lock, Sparkles, UserRoundPen } from 'lucide-react';
import type { LunaUser } from '../types/user';
import { hasPremiumAccess, liveMinutesRemaining, hasActiveSubscription } from '../types/user';
import type { AutoMemoryLine } from '../services/lunaMemoryService';

interface TutorSidebarProps {
  language: 'en' | 'it';
  currentUser: LunaUser;
  autoMemoryLines: AutoMemoryLine[];
  studyGoal: string;
  studyWeaknesses: string;
  studyPreferences: string;
  isEditingProfile: boolean;
  onStudyGoalChange: (value: string) => void;
  onStudyWeaknessesChange: (value: string) => void;
  onStudyPreferencesChange: (value: string) => void;
  onToggleEditProfile: () => void;
  onSaveProfile: () => void;
  onNavigateToDashboard: () => void;
  children?: React.ReactNode;
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--bg-input)',
  color: 'var(--text-main)',
  fontSize: '0.8rem',
  resize: 'vertical',
  fontFamily: 'var(--font-body)',
};

export const TutorSidebar: React.FC<TutorSidebarProps> = ({
  language,
  currentUser,
  autoMemoryLines,
  studyGoal,
  studyWeaknesses,
  studyPreferences,
  isEditingProfile,
  onStudyGoalChange,
  onStudyWeaknessesChange,
  onStudyPreferencesChange,
  onToggleEditProfile,
  onSaveProfile,
  onNavigateToDashboard,
  children,
}) => {
  const hasAccess = hasPremiumAccess(currentUser);
  const liveRemaining = liveMinutesRemaining(currentUser);
  const isSubscriber = hasActiveSubscription(currentUser);
  const none = language === 'en' ? '(not set)' : '(non impostato)';

  return (
    <div className="tutor-sidebar">
      <div
        className="glass-panel"
        style={{
          padding: '1.2rem',
          background: isSubscriber
            ? 'linear-gradient(135deg, rgba(155,89,182,0.12), rgba(155,89,182,0.04))'
            : hasAccess
              ? 'linear-gradient(135deg, rgba(46,204,113,0.1), rgba(46,204,113,0.03))'
              : 'var(--bg-panel)',
          borderColor: isSubscriber ? 'rgba(155,89,182,0.3)' : hasAccess ? 'rgba(46,204,113,0.25)' : 'var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          {isSubscriber ? (
            <Crown size={18} style={{ color: 'var(--secondary)' }} />
          ) : hasAccess ? (
            <Zap size={18} style={{ color: 'var(--success)' }} />
          ) : (
            <Zap size={18} style={{ color: 'var(--primary)' }} />
          )}
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
            {isSubscriber
              ? 'Premium'
              : hasAccess
                ? (language === 'en' ? 'Free trial' : 'Prova gratuita')
                : 'Free Plan'}
          </span>
        </div>
        {!hasAccess && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {language === 'en'
              ? 'Lessons and flashcards remain available. AI tutor requires trial or subscription.'
              : 'Lezioni e flashcard restano disponibili. Il tutor AI richiede prova o abbonamento.'}
          </p>
        )}
        {hasAccess && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {language === 'en' ? 'AI chat + Luna Live active' : 'Chat AI + Luna Live attivi'}
          </p>
        )}
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>
          {language === 'en'
            ? `${liveRemaining} live min left this week (2 h/week)`
            : `${liveRemaining} min live rimasti questa settimana (2 h/sett.)`}
        </p>
      </div>

      {children}

      <div className="glass-panel" style={{ padding: '1.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
          <Sparkles size={15} style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
            {language === 'en' ? 'Luna remembers' : 'Luna ricorda'}
          </span>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
          {language === 'en'
            ? 'Auto-generated from your progress, chat, and activity.'
            : 'Generato automaticamente da progressi, chat e attività.'}
        </p>

        {!hasAccess ? (
          <div
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '1rem 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Lock size={24} style={{ color: 'var(--border)' }} />
            <span>
              {language === 'en'
                ? 'Personalized memory in Premium'
                : 'Memoria personalizzata nel piano Premium'}
            </span>
          </div>
        ) : (
          <ul
            style={{
              margin: 0,
              paddingLeft: '1.1rem',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              lineHeight: 1.55,
            }}
          >
            {autoMemoryLines.map((line) => (
              <li key={line.id}>{line.text}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '1.2rem', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
          <UserRoundPen size={15} style={{ color: 'var(--secondary)' }} />
          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
            {language === 'en' ? 'What you want Luna to know' : 'Tu vuoi che sappia'}
          </span>
          {hasAccess && (
            <button
              type="button"
              onClick={onToggleEditProfile}
              style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}
            >
              {isEditingProfile
                ? language === 'en'
                  ? 'Cancel'
                  : 'Annulla'
                : language === 'en'
                  ? 'Edit'
                  : 'Modifica'}
            </button>
          )}
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
          {language === 'en'
            ? 'Goal, weak points, and how you like to learn — update when something changes.'
            : 'Obiettivo, punti deboli e come preferisci studiare — aggiorna quando serve.'}
        </p>

        {!hasAccess ? (
          <div
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '1rem 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Lock size={24} style={{ color: 'var(--border)' }} />
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem', marginTop: '0.25rem' }}
              onClick={onNavigateToDashboard}
            >
              {language === 'en' ? 'Upgrade' : 'Passa a Premium'}
            </button>
          </div>
        ) : isEditingProfile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              {language === 'en' ? 'Study goal' : 'Obiettivo di studio'}
            </label>
            <textarea
              value={studyGoal}
              onChange={(e) => onStudyGoalChange(e.target.value)}
              rows={2}
              placeholder={language === 'en' ? 'e.g. Pass JLPT N5 by December' : 'es. Superare JLPT N5 entro dicembre'}
              style={fieldStyle}
            />
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              {language === 'en' ? 'Weak points' : 'Punti deboli'}
            </label>
            <textarea
              value={studyWeaknesses}
              onChange={(e) => onStudyWeaknessesChange(e.target.value)}
              rows={2}
              placeholder={language === 'en' ? 'e.g. particles, listening' : 'es. particelle, ascolto'}
              style={fieldStyle}
            />
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              {language === 'en' ? 'Teaching preferences' : 'Preferenze didattiche'}
            </label>
            <textarea
              value={studyPreferences}
              onChange={(e) => onStudyPreferencesChange(e.target.value)}
              rows={2}
              placeholder={
                language === 'en'
                  ? 'e.g. short corrections, more conversation'
                  : 'es. correzioni brevi, più conversazione'
              }
              style={fieldStyle}
            />
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: '0.8rem', padding: '0.4rem' }}
              onClick={onSaveProfile}
            >
              {language === 'en' ? 'Save' : 'Salva'}
            </button>
          </div>
        ) : (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
            <p style={{ margin: '0 0 0.45rem' }}>
              <strong>{language === 'en' ? 'Goal:' : 'Obiettivo:'}</strong>{' '}
              {studyGoal || none}
            </p>
            <p style={{ margin: '0 0 0.45rem' }}>
              <strong>{language === 'en' ? 'Weak points:' : 'Punti deboli:'}</strong>{' '}
              {studyWeaknesses || none}
            </p>
            <p style={{ margin: 0 }}>
              <strong>{language === 'en' ? 'Preferences:' : 'Preferenze:'}</strong>{' '}
              {studyPreferences || none}
            </p>
          </div>
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
