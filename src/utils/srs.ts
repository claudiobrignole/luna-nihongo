export type SRSCardType = 'hiragana' | 'katakana' | 'kanji' | 'vocab' | 'grammar';

export interface SRSCardBase {
  id: string;
  front: string;
  back: string;
  romaji: string;
  meaning: string;
  mnemonic?: string;
  type: SRSCardType;
  unitId: string;
  level: number;
  sourceId: string;
}

export interface SRSCard extends SRSCardBase {
  repetitions: number;
  interval: number;
  easiness: number;
  dueDate: string;
}

export interface CardProgress {
  id: string;
  repetitions: number;
  interval: number;
  easiness: number;
  dueDate: string;
}

/**
 * @deprecated Use CURRICULUM_DECK_CATALOG from curriculumDeck.ts
 * Kept for backwards compatibility in imports only.
 */
export const INITIAL_CARDS: Omit<SRSCard, 'repetitions' | 'interval' | 'easiness' | 'dueDate'>[] = [];

export const scheduleCard = (
  quality: number,
  currentReps: number,
  currentInterval: number,
  currentEasiness: number
): { repetitions: number; interval: number; easiness: number; dueDate: string } => {
  let repetitions = currentReps;
  let interval = currentInterval;
  let easiness = currentEasiness;

  easiness = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easiness < 1.3) {
    easiness = 1.3;
  }

  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easiness);
    }
    repetitions++;
  }

  const due = new Date();
  due.setDate(due.getDate() + interval);
  const dueDate = due.toISOString().split('T')[0];

  return {
    repetitions,
    interval,
    easiness,
    dueDate,
  };
};

export const getDueCardsCount = (cards: SRSCard[]): number => {
  const todayStr = new Date().toISOString().split('T')[0];
  return cards.filter((card) => card.dueDate <= todayStr).length;
};
