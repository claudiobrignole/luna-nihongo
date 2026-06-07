import { CURRICULUM_LEVELS, SYLLABUS } from '../data/curriculum';
import type { HydratedUnit } from '../types/curriculum';
import type { StudyActivity } from '../types/study';
import type { LunaUser } from '../types/user';
import { buildStudyContextForPrompt } from './lunaMemoryService';

export type TutorMode = 'qa' | 'conversation';

function sampleVocab(unit: HydratedUnit, language: 'en' | 'it', max = 4): string {
  const parts: string[] = [];
  for (const k of unit.kana?.slice(0, 2) ?? []) {
    parts.push(`${k.japanese}(${k.romaji})`);
  }
  for (const v of unit.vocab?.slice(0, 2) ?? []) {
    parts.push(`${v.japanese}=${v.meaning[language]}`);
  }
  for (const k of unit.kanji?.slice(0, 1) ?? []) {
    parts.push(`${k.japanese}(${k.meaning[language]})`);
  }
  return parts.slice(0, max).join(', ');
}

function unitLine(unit: HydratedUnit, language: 'en' | 'it', detailed: boolean): string {
  const title = unit.title[language];
  const base = `${unit.id} [L${unit.level} ${unit.type}] ${title}`;
  if (!detailed) return base;
  const samples = sampleVocab(unit, language);
  return samples ? `${base} — ${samples}` : base;
}

export function buildCurriculumKnowledge(language: 'en' | 'it', completedUnitIds: string[]): string {
  const completed = new Set(completedUnitIds);
  const lines: string[] = [];

  for (const level of CURRICULUM_LEVELS) {
    const units = SYLLABUS.filter((u) => u.level === level.level);
    lines.push(`## ${level.title[language]}`);
    lines.push(level.description[language]);
    for (const unit of units) {
      lines.push(`- ${unitLine(unit, language, completed.has(unit.id))}`);
    }
  }

  return lines.join('\n');
}

export function buildTutorSystemPrompt(
  user: LunaUser,
  language: 'en' | 'it',
  mode: TutorMode,
  activities: StudyActivity[] = [],
): string {
  const curriculum = buildCurriculumKnowledge(language, user.completedUnits);
  const langLabel = language === 'it' ? 'Italian' : 'English';
  const preferredLevel = CURRICULUM_LEVELS.find((l) => l.level === user.preferredStartLevel);
  const studyContext = buildStudyContextForPrompt(user, language, activities);

  const shared = `You are Luna-sensei on Luna Nihongo (JLPT N5 guided path).
Student: ${user.username} | XP: ${user.xp} | Completed units: ${user.completedUnits.length}/60
Focus level: ${preferredLevel?.title[language] ?? 'Level 0'}

${studyContext}

FULL CURRICULUM (all 7 levels, 60 units — use this as your teaching memory):
${curriculum}

Reference any unit, grammar, kana, kanji, or vocab from the curriculum when it helps the student.`;

  if (mode === 'conversation') {
    return `${shared}

MODE: LIVE CONVERSATION PRACTICE (like a friendly Gemini chat).
Reply in ${langLabel}, but encourage the student to produce Japanese often.
Your job in each turn:
1. Keep the dialogue flowing naturally (3–6 sentences).
2. If they write Japanese, praise effort, gently correct errors, show a natural version (日本語 + romaji + ${langLabel}).
3. If they are stuck for words, offer 2–3 useful phrases from their current lessons with romaji.
4. Ask follow-up questions about the topic they chose.
5. Suggest topics linked to units they completed or their focus level when they have nothing to say.

Do NOT give long grammar lectures unless asked. Be warm, like Luna the teacher.`;
  }

  return `${shared}

MODE: Q&A TUTOR.
Reply in ${langLabel} with Japanese examples (romaji). Keep answers concise (2–4 sentences).
Answer questions about lessons, homework, culture, and study strategy. Tie answers to specific units when relevant.`;
}

export function conversationOpener(username: string, language: 'en' | 'it'): string {
  if (language === 'it') {
    return `Ciao ${username}! 今日は何について話したい？ Di cosa vuoi parlare oggi?\n\nPuoi rispondere in italiano o provare in giapponese — ti aiuto a trovare le parole giuste e ti correggo con dolcezza. Quando sei pronto, scrivi o usa il microfono.`;
  }
  return `Hi ${username}! 今日は何について話したい？ What would you like to talk about today?\n\nReply in English or try Japanese — I'll help you find the right words and gently correct you. When you're ready, type or use the mic.`;
}

/** System prompt for Gemini Live voice sessions (short replies, barge-in, spoken corrections). */
export function buildLiveTutorSystemPrompt(
  user: LunaUser,
  language: 'en' | 'it',
  activities: StudyActivity[] = [],
): string {
  const curriculum = buildCurriculumKnowledge(language, user.completedUnits);
  const langLabel = language === 'it' ? 'Italian' : 'English';
  const preferredLevel = CURRICULUM_LEVELS.find((l) => l.level === user.preferredStartLevel);
  const studyContext = buildStudyContextForPrompt(user, language, activities);

  return `You are Luna-sensei on Luna Nihongo (JLPT N5 guided path) in a LIVE voice call.

Student: ${user.username} | XP: ${user.xp} | Completed units: ${user.completedUnits.length}/60
Focus level: ${preferredLevel?.title[language] ?? 'Level 0'}

${studyContext}

CURRICULUM MEMORY:
${curriculum}

LIVE VOICE MODE:
- Speak naturally with low latency. Keep replies short (2–4 sentences) unless correcting Japanese.
- Primary language: ${langLabel}. Use Japanese examples with romaji when teaching.
- Listen to spoken Japanese; praise effort and gently correct pronunciation/grammar.
- After correcting, invite the student to repeat the phrase once.
- Allow barge-in when the student starts talking.
- Ask follow-up questions; keep it conversational like a real tutor.
- No long grammar lectures unless asked.`;
}
