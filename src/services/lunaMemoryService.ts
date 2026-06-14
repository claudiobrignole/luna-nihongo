import { CURRICULUM_LEVELS, CURRICULUM_META, SYLLABUS } from '../data/curriculum';
import { curriculumProgressLabel } from './tutorCurriculumKnowledge';
import type { StudyActivity } from '../types/study';
import type { ChatMessage, LunaUser } from '../types/user';

export interface StudentStudyProfile {
  studyGoal: string;
  studyWeaknesses: string;
  studyPreferences: string;
}

export interface AutoMemoryLine {
  id: string;
  text: string;
}

export function resolveStudyProfile(
  user: Pick<LunaUser, 'studyGoal' | 'studyWeaknesses' | 'studyPreferences' | 'memory'>,
): StudentStudyProfile {
  const legacy = user.memory?.trim() ?? '';
  return {
    studyGoal: user.studyGoal?.trim() || legacy,
    studyWeaknesses: user.studyWeaknesses?.trim() ?? '',
    studyPreferences: user.studyPreferences?.trim() ?? '',
  };
}

export function studyProfileToLegacyMemory(profile: StudentStudyProfile): string {
  const lines: string[] = [];
  if (profile.studyGoal) lines.push(`Goal: ${profile.studyGoal}`);
  if (profile.studyWeaknesses) lines.push(`Weaknesses: ${profile.studyWeaknesses}`);
  if (profile.studyPreferences) lines.push(`Preferences: ${profile.studyPreferences}`);
  return lines.join('\n');
}

function unitTitle(unitId: string, language: 'en' | 'it'): string {
  const unit = SYLLABUS.find((u) => u.id === unitId);
  return unit ? unit.title[language] : unitId;
}

function lastUserChatSnippet(chatHistory: ChatMessage[], maxLen = 120): string | null {
  for (let i = chatHistory.length - 1; i >= 0; i--) {
    const msg = chatHistory[i];
    if (msg.sessionDivider || msg.role !== 'user') continue;
    const text = msg.content.trim();
    if (!text) continue;
    return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
  }
  return null;
}

function lastLiveSessionLabel(chatHistory: ChatMessage[]): string | null {
  for (let i = chatHistory.length - 1; i >= 0; i--) {
    const msg = chatHistory[i];
    if (msg.sessionDivider && msg.content) return msg.content;
  }
  return null;
}

function recentActivityLabel(
  activities: StudyActivity[],
  types: StudyActivity['type'][],
  language: 'en' | 'it',
): string | null {
  const hit = activities.find((a) => types.includes(a.type));
  if (!hit) return null;
  const when = new Date(hit.createdAt).toLocaleString(language === 'en' ? 'en-GB' : 'it-IT', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${hit.label} (${when})`;
}

export function buildAutoMemoryLines(
  user: LunaUser,
  language: 'en' | 'it',
  activities: StudyActivity[] = [],
): AutoMemoryLine[] {
  const lines: AutoMemoryLine[] = [];
  const focus = CURRICULUM_LEVELS.find((l) => l.level === user.preferredStartLevel);

  lines.push({
    id: 'progress',
    text: language === 'en'
      ? `Progress: ${curriculumProgressLabel('en', user.completedUnits.length)} · ${user.xp} XP · ${CURRICULUM_META.unitCount} units total (N5+N4)`
      : `Progressi: ${curriculumProgressLabel('it', user.completedUnits.length)} · ${user.xp} XP · ${CURRICULUM_META.unitCount} unità totali (N5+N4)`,
  });

  if (focus) {
    lines.push({
      id: 'focus',
      text: language === 'en'
        ? `Focus level: ${focus.title.en}`
        : `Livello focus: ${focus.title.it}`,
    });
  }

  const recentUnits = user.completedUnits.slice(-3);
  if (recentUnits.length > 0) {
    lines.push({
      id: 'units',
      text: language === 'en'
        ? `Recent units: ${recentUnits.map((id) => unitTitle(id, language)).join(', ')}`
        : `Unità recenti: ${recentUnits.map((id) => unitTitle(id, language)).join(', ')}`,
    });
  }

  const lastChat = lastUserChatSnippet(user.chatHistory ?? []);
  if (lastChat) {
    lines.push({
      id: 'last-chat',
      text: language === 'en'
        ? `Last text chat topic: “${lastChat}”`
        : `Ultimo argomento in chat: “${lastChat}”`,
    });
  }

  const lastLive = lastLiveSessionLabel(user.chatHistory ?? []);
  if (lastLive) {
    lines.push({
      id: 'last-live',
      text: language === 'en'
        ? `Last live session: ${lastLive}`
        : `Ultima sessione live: ${lastLive}`,
    });
  }

  const lastStudy = recentActivityLabel(
    activities,
    ['unit_completed', 'unit_opened', 'flashcard_session', 'quiz_completed'],
    language,
  );
  if (lastStudy) {
    lines.push({
      id: 'last-study',
      text: language === 'en'
        ? `Last study activity: ${lastStudy}`
        : `Ultima attività di studio: ${lastStudy}`,
    });
  }

  const lastTutor = recentActivityLabel(activities, ['tutor_message', 'live_session'], language);
  if (lastTutor) {
    lines.push({
      id: 'last-tutor',
      text: language === 'en'
        ? `Last tutor session: ${lastTutor}`
        : `Ultima sessione col tutor: ${lastTutor}`,
    });
  }

  return lines;
}

export function buildAutoMemoryForPrompt(
  user: LunaUser,
  language: 'en' | 'it',
  activities: StudyActivity[] = [],
): string {
  const lines = buildAutoMemoryLines(user, language, activities);
  if (lines.length === 0) {
    return language === 'en' ? '(no activity yet)' : '(nessuna attività ancora)';
  }
  return lines.map((l) => `- ${l.text}`).join('\n');
}

export function buildStudyContextForPrompt(
  user: LunaUser,
  language: 'en' | 'it',
  activities: StudyActivity[] = [],
): string {
  const profile = resolveStudyProfile(user);
  const auto = buildAutoMemoryForPrompt(user, language, activities);
  const none = language === 'en' ? '(not set)' : '(non impostato)';

  return `STUDENT PROFILE (written by the student — respect and reference often):
Goal: ${profile.studyGoal || none}
Weak points to watch: ${profile.studyWeaknesses || none}
Teaching style preferences: ${profile.studyPreferences || none}

LUNA AUTO MEMORY (from progress, chat & activity — factual, do not invent):
${auto}`;
}
