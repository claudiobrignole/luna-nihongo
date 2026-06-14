import React from 'react';
import { Sparkles, UserRoundPen, Zap, BarChart3, History } from 'lucide-react';

export type TutorContextSheetId = 'memory' | 'profile' | 'plan' | 'progress' | 'history';

interface TutorContextToolbarProps {
  language: 'en' | 'it';
  showHistory?: boolean;
  profileIncomplete?: boolean;
  activeSheet: TutorContextSheetId | null;
  onOpen: (id: TutorContextSheetId) => void;
}

const labels: Record<TutorContextSheetId, { en: string; it: string }> = {
  memory: { en: 'Memory', it: 'Ricorda' },
  profile: { en: 'About me', it: 'Profilo' },
  plan: { en: 'Plan', it: 'Piano' },
  progress: { en: 'Progress', it: 'Progressi' },
  history: { en: 'Live history', it: 'Storico live' },
};

export function TutorContextToolbar({
  language,
  showHistory = false,
  profileIncomplete = false,
  activeSheet,
  onOpen,
}: TutorContextToolbarProps) {
  const items: { id: TutorContextSheetId; icon: React.ReactNode }[] = [
    { id: 'memory', icon: <Sparkles size={16} /> },
    { id: 'profile', icon: <UserRoundPen size={16} /> },
    { id: 'plan', icon: <Zap size={16} /> },
    { id: 'progress', icon: <BarChart3 size={16} /> },
  ];

  if (showHistory) {
    items.push({ id: 'history', icon: <History size={16} /> });
  }

  return (
    <div className="tutor-context-toolbar" role="toolbar" aria-label={language === 'en' ? 'Tutor panels' : 'Pannelli tutor'}>
      {items.map(({ id, icon }) => (
          <button
            key={id}
            type="button"
            className={`tutor-context-chip tutor-context-chip--${id} ${activeSheet === id ? 'active' : ''}`}
            onClick={() => onOpen(id)}
            title={
              id === 'profile' && profileIncomplete
                ? language === 'en'
                  ? 'Complete your study profile'
                  : 'Completa il tuo profilo di studio'
                : undefined
            }
          >
            {icon}
            <span>{labels[id][language]}</span>
            {id === 'profile' && profileIncomplete && (
              <span className="tutor-context-chip-badge" aria-hidden="true" />
            )}
          </button>
        ))}
    </div>
  );
}

export function tutorSheetTitle(id: TutorContextSheetId, language: 'en' | 'it'): string {
  const titles: Record<TutorContextSheetId, { en: string; it: string }> = {
    memory: { en: 'Luna remembers', it: 'Luna ricorda' },
    profile: { en: 'What you want Luna to know', it: 'Tu vuoi che sappia' },
    plan: { en: 'Your plan', it: 'Il tuo piano' },
    progress: { en: 'Your progress', it: 'I tuoi progressi' },
    history: { en: 'Live history', it: 'Storico live' },
  };
  return titles[id][language];
}
