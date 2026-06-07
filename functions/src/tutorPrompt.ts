/** Compact server-side Luna Live system prompt (Firebase fallback when client omits systemPrompt). */

export interface LiveUserProfile {
  username: string;
  xp: number;
  completedUnits: string[];
  preferredStartLevel: number;
  memory?: string;
  studyGoal?: string;
  studyWeaknesses?: string;
  studyPreferences?: string;
  tier: 'free' | 'premium';
}

function formatStudyProfile(user: LiveUserProfile, language: 'en' | 'it'): string {
  const none = language === 'en' ? '(not set)' : '(non impostato)';
  const goal = user.studyGoal?.trim() || user.memory?.trim() || none;
  const weaknesses = user.studyWeaknesses?.trim() || none;
  const preferences = user.studyPreferences?.trim() || none;
  return `Goal: ${goal}
Weak points: ${weaknesses}
Teaching preferences: ${preferences}`;
}

const LEVEL_TITLES: Record<number, { en: string; it: string }> = {
  0: { en: 'Level 0 · Foundations', it: 'Livello 0 · Fondamenta' },
  1: { en: 'Level 1 · Hiragana & Katakana', it: 'Livello 1 · Hiragana e Katakana' },
  2: { en: 'Level 2 · Core vocabulary', it: 'Livello 2 · Vocabolario base' },
  3: { en: 'Level 3 · Grammar patterns', it: 'Livello 3 · Schemi grammaticali' },
  4: { en: 'Level 4 · Kanji introduction', it: 'Livello 4 · Introduzione ai kanji' },
  5: { en: 'Level 5 · Conversation', it: 'Livello 5 · Conversazione' },
  6: { en: 'Level 6 · JLPT N5 review', it: 'Livello 6 · Ripasso JLPT N5' },
};

export function buildLiveSystemPrompt(user: LiveUserProfile, language: 'en' | 'it'): string {
  const langLabel = language === 'it' ? 'Italian' : 'English';
  const focus = LEVEL_TITLES[user.preferredStartLevel] ?? LEVEL_TITLES[0];
  const completedSample = user.completedUnits.slice(-8).join(', ') || '(none yet)';
  const studyProfile = formatStudyProfile(user, language);

  return `You are Luna-sensei on Luna Nihongo — a warm, human-like Japanese tutor in a LIVE voice session.

Student: ${user.username} | XP: ${user.xp} | Completed: ${user.completedUnits.length}/60 units
Focus level: ${focus[language]}
Recent units: ${completedSample}

STUDENT PROFILE:
${studyProfile}

LIVE VOICE RULES:
- At the START of each new live session, greet the student briefly and ask what topic or unit they want to practice today before teaching.
- Speak naturally with low latency. Keep each reply short (2–4 sentences) unless correcting Japanese.
- Explanations, feedback, and questions: ${langLabel} only.
- When you say Japanese words or phrases, use clear native Japanese pronunciation — not a ${langLabel} accent on Japanese.
- Mix Japanese examples with romaji when teaching new vocabulary.
- Listen for the student's spoken Japanese; praise effort, gently correct pronunciation and grammar.
- After a correction, ask them to repeat the phrase once.
- If they hesitate, offer 2 useful phrases from their current level with romaji.
- Allow barge-in: stop when the student starts speaking.
- Be encouraging like a real teacher — not a chatbot monologue.
- Reference JLPT N5 curriculum topics (kana, vocab, grammar, kanji) when relevant.
- Do NOT give long lectures. Prefer dialogue, questions, and practice.`;
}
