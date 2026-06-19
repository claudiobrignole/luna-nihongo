import React from 'react';
import { Sparkles, UserRoundPen, History } from 'lucide-react';
import type { ChatMessage, LunaUser } from '../types/user';
import { hasPremiumAccess } from '../types/user';
import type { AutoMemoryLine } from '../services/lunaMemoryService';
import { tutorSheetTitle } from '../utils/tutorSheetTitle';
import type { TutorContextSheetId } from './TutorContextToolbar';
import {
  TutorMemoryPanel,
  TutorProfilePanel,
} from './tutorContextPanels';
import { LiveHistoryPanel } from './LiveHistoryPanel';
import { PremiumRetentionNotice } from './PremiumRetentionNotice';

interface TutorContextTilesProps {
  language: 'en' | 'it';
  currentUser: LunaUser;
  showHistory?: boolean;
  profileIncomplete?: boolean;
  autoMemoryLines: AutoMemoryLine[];
  chatHistory: ChatMessage[];
  onChatHistoryChange: (history: ChatMessage[]) => void;
  onNavigateToDashboard: () => void;
  studyGoal: string;
  studyWeaknesses: string;
  studyPreferences: string;
  isEditingProfile: boolean;
  onStudyGoalChange: (value: string) => void;
  onStudyWeaknessesChange: (value: string) => void;
  onStudyPreferencesChange: (value: string) => void;
  onToggleEditProfile: () => void;
  onSaveProfile: () => void;
}

interface TutorTileProps {
  id: TutorContextSheetId;
  language: 'en' | 'it';
  icon: React.ReactNode;
  wide?: boolean;
  profileIncomplete?: boolean;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

function TutorTile({
  id,
  language,
  icon,
  wide,
  profileIncomplete,
  headerAction,
  children,
}: TutorTileProps) {
  return (
    <section
      className={`glass-panel tutor-context-tile tutor-context-tile--${id}${wide ? ' tutor-context-tile--wide' : ''}`}
      aria-labelledby={`tutor-tile-${id}`}
    >
      <div className="tutor-context-tile-inner">
        <header className={`tutor-context-tile-header${headerAction ? ' tutor-context-tile-header--split' : ''}`}>
          <div className="tutor-context-tile-header-main">
            {icon}
            <h3 id={`tutor-tile-${id}`}>{tutorSheetTitle(id, language)}</h3>
            {profileIncomplete && (
              <span className="tutor-context-tile-badge" aria-hidden="true" />
            )}
          </div>
          {headerAction}
        </header>
        <div className="tutor-context-tile-body">{children}</div>
      </div>
    </section>
  );
}

export const TutorContextTiles: React.FC<TutorContextTilesProps> = ({
  language,
  currentUser,
  showHistory = false,
  profileIncomplete = false,
  autoMemoryLines,
  chatHistory,
  onChatHistoryChange,
  onNavigateToDashboard,
  studyGoal,
  studyWeaknesses,
  studyPreferences,
  isEditingProfile,
  onStudyGoalChange,
  onStudyWeaknessesChange,
  onStudyPreferencesChange,
  onToggleEditProfile,
  onSaveProfile,
}) => {
  const hasAccess = hasPremiumAccess(currentUser);

  return (
    <div
      className={`tutor-context-tiles${showHistory ? ' tutor-context-tiles--live' : ''}`}
      role="region"
      aria-label={language === 'en' ? 'Tutor context' : 'Contesto tutor'}
    >
      {showHistory && (
        <TutorTile
          id="history"
          language={language}
          icon={<History size={16} style={{ color: 'var(--primary)' }} />}
          wide
        >
          <LiveHistoryPanel
            language={language}
            currentUser={currentUser}
            chatHistory={chatHistory}
            onChatHistoryChange={onChatHistoryChange}
            onNavigateToDashboard={onNavigateToDashboard}
            embedded
          />
          <PremiumRetentionNotice language={language} currentUser={currentUser} />
        </TutorTile>
      )}

      <TutorTile
        id="memory"
        language={language}
        icon={<Sparkles size={16} style={{ color: 'var(--primary)' }} />}
      >
        <TutorMemoryPanel
          language={language}
          currentUser={currentUser}
          autoMemoryLines={autoMemoryLines}
        />
      </TutorTile>

      <TutorTile
        id="profile"
        language={language}
        icon={<UserRoundPen size={16} style={{ color: 'var(--secondary)' }} />}
        profileIncomplete={profileIncomplete}
        headerAction={
          hasAccess ? (
            <button type="button" className="tutor-context-edit-btn" onClick={onToggleEditProfile}>
              {isEditingProfile
                ? (language === 'en' ? 'Cancel' : 'Annulla')
                : (language === 'en' ? 'Edit' : 'Modifica')}
            </button>
          ) : undefined
        }
      >
        <TutorProfilePanel
          language={language}
          currentUser={currentUser}
          studyGoal={studyGoal}
          studyWeaknesses={studyWeaknesses}
          studyPreferences={studyPreferences}
          isEditingProfile={isEditingProfile}
          onStudyGoalChange={onStudyGoalChange}
          onStudyWeaknessesChange={onStudyWeaknessesChange}
          onStudyPreferencesChange={onStudyPreferencesChange}
          onToggleEditProfile={onToggleEditProfile}
          onSaveProfile={onSaveProfile}
          onNavigateToDashboard={onNavigateToDashboard}
        />
      </TutorTile>
    </div>
  );
};
