import type {
  GrammarPoint,
  HydratedUnit,
  KanaItem,
  KanjiItem,
  Locale,
  Quiz,
  VocabItem,
} from '../types/curriculum';

export interface DisplayCard {
  id: string;
  japanese: string;
  romaji: string;
  label: string;
  extra?: string;
  mnemonic?: { it: string; en: string };
}

function isKanaItem(item: unknown): item is KanaItem {
  return typeof item === 'object' && item !== null && 'script' in item;
}

function isKanjiItem(item: unknown): item is KanjiItem {
  return typeof item === 'object' && item !== null && 'strokeCount' in item;
}

function isVocabItem(item: unknown): item is VocabItem {
  return typeof item === 'object' && item !== null && 'tags' in item;
}

function kanaCard(k: KanaItem): DisplayCard {
  return {
    id: k.id,
    japanese: k.japanese,
    romaji: k.romaji,
    label: k.romaji,
    mnemonic: k.mnemonic,
  };
}

function kanjiCard(k: KanjiItem, language: Locale): DisplayCard {
  const on = k.readingOnyomi.join(' · ');
  const kun = k.readingKunyomi.join(' · ');
  return {
    id: k.id,
    japanese: k.japanese,
    romaji: kun || on,
    label: k.meaning[language],
    extra: [on && `On: ${on}`, kun && `Kun: ${kun}`].filter(Boolean).join(' · '),
    mnemonic: k.mnemonic,
  };
}

function vocabCard(v: VocabItem, language: Locale): DisplayCard {
  return {
    id: v.id,
    japanese: v.japanese,
    romaji: v.romaji,
    label: v.meaning[language],
    extra: v.kana !== v.japanese ? v.kana : undefined,
    mnemonic: v.mnemonic,
  };
}

function isGrammarPoint(item: unknown): item is GrammarPoint {
  return typeof item === 'object' && item !== null && 'explanation' in item && 'examples' in item;
}

function poolItemToCard(item: KanaItem | KanjiItem | VocabItem | GrammarPoint, language: Locale): DisplayCard | null {
  if (isKanaItem(item)) return kanaCard(item);
  if (isKanjiItem(item)) return kanjiCard(item, language);
  if (isVocabItem(item)) return vocabCard(item, language);
  return null;
}

export function getDisplayCards(unit: HydratedUnit, language: Locale): DisplayCard[] {
  const cards: DisplayCard[] = [];

  for (const k of unit.kana ?? []) cards.push(kanaCard(k));
  for (const k of unit.kanji ?? []) cards.push(kanjiCard(k, language));
  for (const v of unit.vocab ?? []) cards.push(vocabCard(v, language));
  for (const item of unit.reviewPool ?? []) {
    const card = poolItemToCard(item, language);
    if (card) cards.push(card);
  }

  return cards;
}

export function getGrammarPoints(unit: HydratedUnit): GrammarPoint[] {
  const fromRefs = unit.grammar ?? [];
  const fromPool = (unit.reviewPool ?? []).filter(isGrammarPoint);
  if (fromPool.length === 0) return fromRefs;

  const seen = new Set(fromRefs.map((g) => g.id));
  const merged = [...fromRefs];
  for (const point of fromPool) {
    if (!seen.has(point.id)) {
      merged.push(point);
      seen.add(point.id);
    }
  }
  return merged;
}

export function getQuizOptionLabel(option: { it: string; en: string }, language: Locale): string {
  return option[language];
}

export function checkQuizAnswer(
  quiz: Quiz,
  _language: Locale,
  selectedIndex: number | null,
  spellingInput: string,
  matchingAnswers: Record<string, string>,
): boolean {
  if (quiz.type === 'multiple-choice') {
    return selectedIndex === quiz.correctIndex;
  }

  if (quiz.type === 'spelling') {
    const normalized = spellingInput.trim().toLowerCase();
    const accepted = [quiz.answer, ...(quiz.acceptedAnswers ?? [])].map((a) => a.toLowerCase());
    return accepted.includes(normalized);
  }

  if (quiz.type === 'matching') {
    return quiz.pairs.every((pair) => matchingAnswers[pair.left] === pair.right);
  }

  return false;
}

export function unitTypeLabel(
  type: HydratedUnit['type'],
  language: Locale,
  unitId?: string,
): string {
  if (unitId?.startsWith('writing-')) {
    return language === 'it' ? 'scrittura' : 'writing';
  }

  const labels: Record<HydratedUnit['type'], { it: string; en: string }> = {
    hiragana: { it: 'hiragana', en: 'hiragana' },
    katakana: { it: 'katakana', en: 'katakana' },
    kanji: { it: 'kanji', en: 'kanji' },
    grammar: { it: 'grammatica', en: 'grammar' },
    vocab: { it: 'vocabolario', en: 'vocab' },
    review: { it: 'ripasso', en: 'review' },
    situation: { it: 'situazione', en: 'situation' },
  };
  return labels[type][language];
}
