import React from 'react';
import { Zap, Crown, Lock, Sparkles, UserRoundPen } from 'lucide-react';
import type { LunaUser } from '../types/user';
import { hasPremiumAccess, liveMinutesRemaining, hasActiveSubscription } from '../types/user';
import type { AutoMemoryLine } from '../services/lunaMemoryService';

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

interface PanelBaseProps {
  language: 'en' | 'it';
  currentUser: LunaUser;
}

export function TutorPlanPanel({ language, currentUser }: PanelBaseProps) {
  const hasAccess = hasPremiumAccess(currentUser);
  const liveRemaining = liveMinutesRemaining(currentUser);
  const isSubscriber = hasActiveSubscription(currentUser);

  return (
    <div
      className="glass-panel tutor-context-panel"
      style={{
        background: isSubscriber
          ? 'linear-gradient(135deg, rgba(155,89,182,0.12), rgba(155,89,182,0.04))'
          : hasAccess
            ? 'linear-gradient(135deg, rgba(46,204,113,0.1), rgba(46,204,113,0.03))'
            : 'var(--ln-card-bg)',
        borderColor: isSubscriber ? 'rgba(155,89,182,0.3)' : hasAccess ? 'rgba(46,204,113,0.25)' : 'var(--border)',
      }}
    >
      <div className="tutor-context-panel-title">
        {isSubscriber ? (
          <Crown size={18} style={{ color: 'var(--secondary)' }} />
        ) : (
          <Zap size={18} style={{ color: hasAccess ? 'var(--success)' : 'var(--primary)' }} />
        )}
        <span>
          {isSubscriber
            ? 'Premium'
            : hasAccess
              ? (language === 'en' ? 'Free trial' : 'Prova gratuita')
              : 'Free Plan'}
        </span>
      </div>
      {!hasAccess && (
        <p className="tutor-context-panel-muted">
          {language === 'en'
            ? 'Lessons and flashcards remain available. AI tutor requires trial or subscription.'
            : 'Lezioni e flashcard restano disponibili. Il tutor AI richiede prova o abbonamento.'}
        </p>
      )}
      {hasAccess && (
        <p className="tutor-context-panel-muted">
          {language === 'en' ? 'AI chat + Luna Live active' : 'Chat AI + Luna Live attivi'}
        </p>
      )}
      <p className="tutor-context-panel-meta">
        {language === 'en'
          ? `${liveRemaining} live min left this week (2 h/week)`
          : `${liveRemaining} min live rimasti questa settimana (2 h/sett.)`}
      </p>
    </div>
  );
}

interface MemoryPanelProps extends PanelBaseProps {
  autoMemoryLines: AutoMemoryLine[];
}

export function TutorMemoryPanel({ language, currentUser, autoMemoryLines }: MemoryPanelProps) {
  const hasAccess = hasPremiumAccess(currentUser);

  return (
    <div className="glass-panel tutor-context-panel">
      <div className="tutor-context-panel-title">
        <Sparkles size={15} style={{ color: 'var(--primary)' }} />
        <span>{language === 'en' ? 'Luna remembers' : 'Luna ricorda'}</span>
      </div>
      <p className="tutor-context-panel-muted">
        {language === 'en'
          ? 'Auto-generated from your progress, chat, and activity.'
          : 'Generato automaticamente da progressi, chat e attività.'}
      </p>
      {!hasAccess ? (
        <div className="tutor-context-locked">
          <Lock size={24} />
          <span>
            {language === 'en' ? 'Personalized memory in Premium' : 'Memoria personalizzata nel piano Premium'}
          </span>
        </div>
      ) : (
        <ul className="tutor-context-list">
          {autoMemoryLines.map((line) => (
            <li key={line.id}>{line.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface ProfilePanelProps extends PanelBaseProps {
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
}

export function TutorProfilePanel({
  language,
  currentUser,
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
}: ProfilePanelProps) {
  const hasAccess = hasPremiumAccess(currentUser);
  const none = language === 'en' ? '(not set)' : '(non impostato)';

  return (
    <div className="glass-panel tutor-context-panel">
      <div className="tutor-context-panel-title tutor-context-panel-title--split">
        <span className="tutor-context-panel-title-left">
          <UserRoundPen size={15} style={{ color: 'var(--secondary)' }} />
          <span>{language === 'en' ? 'What you want Luna to know' : 'Tu vuoi che sappia'}</span>
        </span>
        {hasAccess && (
          <button type="button" className="tutor-context-edit-btn" onClick={onToggleEditProfile}>
            {isEditingProfile
              ? (language === 'en' ? 'Cancel' : 'Annulla')
              : (language === 'en' ? 'Edit' : 'Modifica')}
          </button>
        )}
      </div>
      <p className="tutor-context-panel-muted">
        {language === 'en'
          ? 'Goal, weak points, and how you like to learn — update when something changes.'
          : 'Obiettivo, punti deboli e come preferisci studiare — aggiorna quando serve.'}
      </p>
      {!hasAccess ? (
        <div className="tutor-context-locked">
          <Lock size={24} />
          <button type="button" className="btn btn-primary tutor-context-upgrade-btn" onClick={onNavigateToDashboard}>
            {language === 'en' ? 'Upgrade' : 'Passa a Premium'}
          </button>
        </div>
      ) : isEditingProfile ? (
        <div className="tutor-profile-form">
          <label>{language === 'en' ? 'Study goal' : 'Obiettivo di studio'}</label>
          <textarea
            value={studyGoal}
            onChange={(e) => onStudyGoalChange(e.target.value)}
            rows={2}
            placeholder={language === 'en' ? 'e.g. Pass JLPT N5 by December' : 'es. Superare JLPT N5 entro dicembre'}
            style={fieldStyle}
          />
          <label>{language === 'en' ? 'Weak points' : 'Punti deboli'}</label>
          <textarea
            value={studyWeaknesses}
            onChange={(e) => onStudyWeaknessesChange(e.target.value)}
            rows={2}
            placeholder={language === 'en' ? 'e.g. particles, listening' : 'es. particelle, ascolto'}
            style={fieldStyle}
          />
          <label>{language === 'en' ? 'Teaching preferences' : 'Preferenze didattiche'}</label>
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
          <button type="button" className="btn tutor-profile-save-btn" onClick={onSaveProfile}>
            {language === 'en' ? 'Save' : 'Salva'}
          </button>
        </div>
      ) : (
        <div className="tutor-profile-readonly">
          <p>
            <strong>{language === 'en' ? 'Goal:' : 'Obiettivo:'}</strong> {studyGoal || none}
          </p>
          <p>
            <strong>{language === 'en' ? 'Weak points:' : 'Punti deboli:'}</strong> {studyWeaknesses || none}
          </p>
          <p>
            <strong>{language === 'en' ? 'Preferences:' : 'Preferenze:'}</strong> {studyPreferences || none}
          </p>
        </div>
      )}
    </div>
  );
}

export function TutorProgressPanel({ language, currentUser }: PanelBaseProps) {
  return (
    <div className="glass-panel tutor-context-panel">
      <p className="tutor-context-panel-label">
        {language === 'en' ? 'Your Progress' : 'I tuoi Progressi'}
      </p>
      <div className="tutor-progress-row">
        <span>✅ {language === 'en' ? 'Lessons' : 'Lezioni'}</span>
        <strong>{currentUser.completedUnits.length}</strong>
      </div>
      <div className="tutor-progress-row">
        <span>⚡ XP</span>
        <strong>{currentUser.xp}</strong>
      </div>
    </div>
  );
}
