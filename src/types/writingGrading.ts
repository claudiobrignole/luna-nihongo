import type { Bilingual, WritingQuiz } from './curriculum';

/** Minimum score (0–100) for a writing quiz to count as passed. */
export const WRITING_PASS_SCORE_THRESHOLD = 70;

/** Bundle fields present on writing quizzes in curriculum v1.1.0. */
export interface WritingQuizExtended extends WritingQuiz {
  targetLength?: { min: number; max: number };
  modelAnswerKana?: string;
  modelAnswerRomaji?: string;
  modelAnswerTranslation?: Bilingual;
  expectsGrammarRefs?: string[];
  expectsVocabRefs?: string[];
}

export interface WritingGradeCriterion {
  criterion: string;
  met: boolean;
  comment: string;
}

export interface WritingGradeResult {
  passed: boolean;
  score: number;
  perCriterion: WritingGradeCriterion[];
  overallComment: string;
  encouragement: string;
}

/** Payload sent to /api/writing-grade.php only at submit time. */
export interface WritingGradeRequest {
  language: 'it' | 'en';
  studentAnswer: string;
  task: Bilingual;
  rubric: Bilingual[];
  modelAnswer: string;
  expectsGrammarRefs?: string[];
  expectsVocabRefs?: string[];
}

export interface WritingGradeResponse {
  grade?: WritingGradeResult;
  error?: string;
}
