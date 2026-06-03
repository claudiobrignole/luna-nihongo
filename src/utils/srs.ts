export interface SRSCard {
  id: string;
  front: string;
  back: string;
  romaji: string;
  meaning: string;
  mnemonic?: string;
  type: 'hiragana' | 'katakana' | 'kanji';
  // SM-2 parameters
  repetitions: number;
  interval: number;
  easiness: number;
  dueDate: string; // ISO String (Date only or datetime)
}

export interface CardProgress {
  id: string;
  repetitions: number;
  interval: number;
  easiness: number;
  dueDate: string;
}

// Default initial cards to feed into the SRS deck
export const INITIAL_CARDS: Omit<SRSCard, 'repetitions' | 'interval' | 'easiness' | 'dueDate'>[] = [
  { id: 'srs-h-a', front: 'あ', back: 'a', romaji: 'a', meaning: 'a (albero / father)', type: 'hiragana', mnemonic: 'A with a loop' },
  { id: 'srs-h-i', front: 'い', back: 'i', romaji: 'i', meaning: 'i (imbuto / meet)', type: 'hiragana', mnemonic: 'Two eels' },
  { id: 'srs-h-u', front: 'う', back: 'u', romaji: 'u', meaning: 'u (uva / boot)', type: 'hiragana', mnemonic: 'Sideways U / camel hump' },
  { id: 'srs-h-e', front: 'え', back: 'e', romaji: 'e', meaning: 'e (erba / pen)', type: 'hiragana', mnemonic: 'Exotic runner stretching' },
  { id: 'srs-h-o', front: 'お', back: 'o', romaji: 'o', meaning: 'o (occhio / boat)', type: 'hiragana', mnemonic: 'あ with a flag on the right' },
  { id: 'srs-h-ka', front: 'か', back: 'ka', romaji: 'ka', meaning: 'ka', type: 'hiragana', mnemonic: 'Karate kicker' },
  { id: 'srs-h-ki', front: 'き', back: 'ki', romaji: 'ki', meaning: 'ki', type: 'hiragana', mnemonic: 'A key' },
  { id: 'srs-h-ku', front: 'く', back: 'ku', romaji: 'ku', meaning: 'ku', type: 'hiragana', mnemonic: 'Cuckoo beak' },
  { id: 'srs-h-ke', front: 'け', back: 'ke', romaji: 'ke', meaning: 'ke', type: 'hiragana', mnemonic: 'Keg of sake' },
  { id: 'srs-h-ko', front: 'こ', back: 'ko', romaji: 'ko', meaning: 'ko', type: 'hiragana', mnemonic: 'Two co-operating lines' },
  { id: 'srs-kn-1', front: '一', back: 'ichi', romaji: 'ichi', meaning: 'uno / one', type: 'kanji', mnemonic: 'One horizontal stroke' },
  { id: 'srs-kn-2', front: '二', back: 'ni', romaji: 'ni', meaning: 'due / two', type: 'kanji', mnemonic: 'Two horizontal lines' },
  { id: 'srs-kn-3', front: '三', back: 'san', romaji: 'san', meaning: 'tre / three', type: 'kanji', mnemonic: 'Three horizontal lines' },
  { id: 'srs-kn-sun', front: '日', back: 'hi / nichi', romaji: 'hi / nichi', meaning: 'sole / sun / giorno', type: 'kanji', mnemonic: 'Sun box with center ray' },
  { id: 'srs-kn-moon', front: '月', back: 'tsuki / getsu', romaji: 'tsuki / getsu', meaning: 'luna / moon / mese', type: 'kanji', mnemonic: 'Crescent moon (Luna!)' },
  { id: 'srs-kn-tree', front: '木', back: 'ki / moku', romaji: 'ki / moku', meaning: 'albero / tree / legno', type: 'kanji', mnemonic: 'Tree trunk with branches' },
];

/**
 * SuperMemo SM-2 Algorithm Implementation
 * Quality levels:
 * 0-2: Forgot (Again)
 * 3: Hard (Correct with major effort)
 * 4: Good (Correct with minor hesitation)
 * 5: Easy (Instant correct recall)
 */
export const scheduleCard = (
  quality: number,
  currentReps: number,
  currentInterval: number,
  currentEasiness: number
): { repetitions: number; interval: number; easiness: number; dueDate: string } => {
  let repetitions = currentReps;
  let interval = currentInterval;
  let easiness = currentEasiness;

  // Adjust easiness factor
  easiness = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easiness < 1.3) {
    easiness = 1.3;
  }

  if (quality < 3) {
    // Incorrect answer, reset interval & repetitions
    repetitions = 0;
    interval = 1;
  } else {
    // Correct answer
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easiness);
    }
    repetitions++;
  }

  // Set due date to today + interval (in days)
  const due = new Date();
  due.setDate(due.getDate() + interval);
  const dueDate = due.toISOString().split('T')[0];

  return {
    repetitions,
    interval,
    easiness,
    dueDate
  };
};

export const getDueCardsCount = (cards: SRSCard[]): number => {
  const todayStr = new Date().toISOString().split('T')[0];
  return cards.filter(card => card.dueDate <= todayStr).length;
};
