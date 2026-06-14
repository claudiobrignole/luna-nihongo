import React from 'react';
import type { LunaUser } from '../types/user';
import type { AutoMemoryLine } from '../services/lunaMemoryService';
import {
  TutorMemoryPanel,
  TutorPlanPanel,
  TutorProfilePanel,
  TutorProgressPanel,
} from './tutorContextPanels';

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
}) => (
  <div className="tutor-sidebar">
    <TutorPlanPanel language={language} currentUser={currentUser} />
    {children}
    <TutorMemoryPanel language={language} currentUser={currentUser} autoMemoryLines={autoMemoryLines} />
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
    <TutorProgressPanel language={language} currentUser={currentUser} />
  </div>
);
