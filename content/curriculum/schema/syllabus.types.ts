// ============================================================
// Luna Nihongo — Syllabus content schema
// schemaVersion: 1.0.0
// ------------------------------------------------------------
// Design notes:
// - Atomic content (kana / kanji / vocab / grammar) lives in
//   reference repositories and is keyed by stable `id`.
// - Units do NOT embed content; they REFERENCE it via *Refs[].
//   A build-time hydration step inlines the referenced records
//   for the React <LearningPath /> component.
// - `romaji` is ALWAYS populated. Visibility is a user setting
//   (settings.showRomaji), never a content concern.
// - Quizzes that would become trivial/incoherent when romaji is
//   shown carry `requiresRomaji` so the quiz engine can adapt.
// ============================================================

/** Bilingual string. Both locales are mandatory everywhere. */
export interface Bilingual {
  it: string;
  en: string;
}

export type Locale = "it" | "en";

// ------------------------------------------------------------
// ATOMIC CONTENT ENTITIES
// ------------------------------------------------------------

export type KanaScript = "hiragana" | "katakana";

/** A single kana character. id e.g. "hira-a", "kata-ka". */
export interface KanaItem {
  id: string;
  script: KanaScript;
  japanese: string;        // か
  romaji: string;          // "ka"  (always present)
  /** Row/group for pedagogical grouping, e.g. "k-line", "vowels". */
  group: string;
  mnemonic?: Bilingual;    // memory hook, optional
}

/** A single N5 kanji. id e.g. "kanji-ichi" (一). */
export interface KanjiItem {
  id: string;
  japanese: string;        // 一
  meaning: Bilingual;      // { it: "uno", en: "one" }
  readingOnyomi: string[]; // ["イチ", "イツ"]  (katakana convention)
  readingKunyomi: string[];// ["ひと-", "ひと.つ"]
  strokeCount: number;
  /** Radical / component ids reused as mnemonic scaffolding. */
  components?: string[];   // e.g. ["kanji-ki"] for 林
  mnemonic?: Bilingual;
  /** Vocab ids that exemplify this kanji (only using prior kanji). */
  exampleVocabRefs?: string[];
}

/** A vocabulary entry. id e.g. "vocab-mizu" (水). */
export interface VocabItem {
  id: string;
  japanese: string;        // 水
  kana: string;            // みず  (reading in kana, always present)
  romaji: string;          // "mizu" (always present)
  meaning: Bilingual;
  /** Thematic tags for filtering & tutor recall. */
  tags: VocabTag[];
  /** Kanji ids used, for gating (only show vocab whose kanji are taught). */
  usesKanjiRefs?: string[];
  mnemonic?: Bilingual;
}

export type VocabTag =
  | "greetings" | "numbers" | "family" | "time" | "food"
  | "places" | "verbs" | "adjectives" | "people" | "nature"
  | "school" | "body" | "colors" | "directions" | "everyday"
  | "particles" | "question-words" | "counters";

/** A grammar point. id e.g. "gr-wa-topic". */
export interface GrammarPoint {
  id: string;
  title: Bilingual;
  explanation: Bilingual;  // prose; may contain \n for paragraphs
  examples: GrammarExample[];
  /** Related grammar ids, for the tutor's review suggestions. */
  relatedRefs?: string[];
}

export interface GrammarExample {
  japanese: string;        // わたしは がくせいです。
  romaji: string;          // "watashi wa gakusei desu." (always present)
  translation: Bilingual;
  /** Optional note highlighting the structure under study. */
  note?: Bilingual;
}

// ------------------------------------------------------------
// QUIZZES
// ------------------------------------------------------------

export type QuizType = "multiple-choice" | "spelling" | "matching";

export interface QuizBase {
  id: string;
  type: QuizType;
  prompt: Bilingual;
  /**
   * If true, this question depends on romaji being meaningful
   * (e.g. "type the romaji for か"). The engine should skip or
   * swap it when the learner has romaji visible, to avoid
   * trivial/incoherent questions. Default: false.
   */
  requiresRomaji?: boolean;
  /** XP awarded for a correct answer. */
  xp?: number;
}

export interface MultipleChoiceQuiz extends QuizBase {
  type: "multiple-choice";
  options: Bilingual[];      // option labels (often identical it/en for JP text)
  correctIndex: number;
}

export interface SpellingQuiz extends QuizBase {
  type: "spelling";
  /** What the learner must produce, e.g. "ka" or "か". */
  answer: string;
  /** Accepted alternative spellings (e.g. "si"/"shi"). */
  acceptedAnswers?: string[];
}

export interface MatchingQuiz extends QuizBase {
  type: "matching";
  pairs: { left: string; right: string }[];
}

export type Quiz = MultipleChoiceQuiz | SpellingQuiz | MatchingQuiz;

// ------------------------------------------------------------
// UNITS & LEVELS
// ------------------------------------------------------------

export type UnitType =
  | "hiragana" | "katakana" | "kanji" | "grammar" | "vocab" | "review";

export interface SyllabusUnit {
  id: string;                 // slug, e.g. "hiragana-vowels"
  level: number;              // macro-section index (0,1,2,...)
  order: number;              // position within the level
  type: UnitType;
  title: Bilingual;
  description: Bilingual;
  contentVersion: number;     // bump when items/quizzes change materially

  /** References into the atomic repositories. Hydrated at build time. */
  kanaRefs?: string[];
  kanjiRefs?: string[];
  vocabRefs?: string[];
  grammarRefs?: string[];

  /**
   * For type "review": ids of items/points pulled from EARLIER units
   * to be re-tested. May mix kana/kanji/vocab/grammar refs above.
   */
  reviewPoolRefs?: string[];

  quizzes: Quiz[];

  /** Unit ids that must be completed before this unlocks. */
  prerequisites?: string[];

  /** Topics the AI tutor (Luna) can offer to review after completion. */
  tutorReviewTopics?: Bilingual[];
}

export interface SyllabusLevel {
  level: number;
  title: Bilingual;
  description: Bilingual;
}

export interface Manifest {
  schemaVersion: string;      // "1.0.0"
  targetLevel: "N5";
  /** Ordered list of unit ids = the canonical learning path. */
  unitOrder: string[];
  levels: SyllabusLevel[];
}

// ------------------------------------------------------------
// HYDRATION (build-time output consumed by React)
// ------------------------------------------------------------

/** A unit with its refs resolved to full records. */
export interface HydratedUnit extends Omit<
  SyllabusUnit,
  "kanaRefs" | "kanjiRefs" | "vocabRefs" | "grammarRefs" | "reviewPoolRefs"
> {
  kana?: KanaItem[];
  kanji?: KanjiItem[];
  vocab?: VocabItem[];
  grammar?: GrammarPoint[];
  reviewPool?: (KanaItem | KanjiItem | VocabItem | GrammarPoint)[];
}
