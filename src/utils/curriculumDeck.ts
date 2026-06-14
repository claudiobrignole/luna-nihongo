import { SYLLABUS } from '../data/curriculum';
import type {
  DialogueLine,
  DialogueScene,
  GrammarPoint,
  HydratedUnit,
  KanaItem,
  KanjiItem,
  Locale,
  VocabItem,
} from '../types/curriculum';
import type { SRSCardBase, SRSCardType } from './srs';
import { dialogueLineId } from './dialogueDisplay';

function isKanaItem(item: unknown): item is KanaItem {
  return typeof item === 'object' && item !== null && 'script' in item;
}

function isKanjiItem(item: unknown): item is KanjiItem {
  return typeof item === 'object' && item !== null && 'strokeCount' in item;
}

function isVocabItem(item: unknown): item is VocabItem {
  return typeof item === 'object' && item !== null && 'tags' in item;
}

function isGrammarPoint(item: unknown): item is GrammarPoint {
  return typeof item === 'object' && item !== null && 'explanation' in item && 'title' in item;
}

function kanaCard(k: KanaItem, unit: HydratedUnit, locale: Locale): SRSCardBase {
  return {
    id: `srs-${k.id}`,
    front: k.japanese,
    back: k.romaji,
    romaji: k.romaji,
    meaning: k.romaji,
    mnemonic: k.mnemonic?.[locale],
    type: k.script,
    unitId: unit.id,
    level: unit.level,
    sourceId: k.id,
  };
}

function kanjiCard(k: KanjiItem, unit: HydratedUnit, locale: Locale): SRSCardBase {
  const on = k.readingOnyomi.join(' · ');
  const kun = k.readingKunyomi.join(' · ');
  const readings = [kun && `Kun: ${kun}`, on && `On: ${on}`].filter(Boolean).join(' · ');
  return {
    id: `srs-${k.id}`,
    front: k.japanese,
    back: readings || k.meaning[locale],
    romaji: kun || on || k.meaning[locale],
    meaning: k.meaning[locale],
    mnemonic: k.mnemonic?.[locale],
    type: 'kanji',
    unitId: unit.id,
    level: unit.level,
    sourceId: k.id,
  };
}

function vocabCard(v: VocabItem, unit: HydratedUnit, locale: Locale): SRSCardBase {
  return {
    id: `srs-${v.id}`,
    front: v.japanese,
    back: v.meaning[locale],
    romaji: v.romaji,
    meaning: v.meaning[locale],
    mnemonic: v.mnemonic?.[locale],
    type: 'vocab',
    unitId: unit.id,
    level: unit.level,
    sourceId: v.id,
  };
}

function grammarCard(g: GrammarPoint, unit: HydratedUnit, locale: Locale): SRSCardBase | null {
  const ex = g.examples[0];
  if (!ex) return null;
  return {
    id: `srs-${g.id}`,
    front: ex.japanese,
    back: g.title[locale],
    romaji: ex.romaji,
    meaning: ex.translation[locale],
    mnemonic: g.title[locale],
    type: 'grammar',
    unitId: unit.id,
    level: unit.level,
    sourceId: g.id,
  };
}

function poolItemToCard(
  item: KanaItem | KanjiItem | VocabItem | GrammarPoint,
  unit: HydratedUnit,
  locale: Locale,
): SRSCardBase | null {
  if (isKanaItem(item)) return kanaCard(item, unit, locale);
  if (isKanjiItem(item)) return kanjiCard(item, unit, locale);
  if (isVocabItem(item)) return vocabCard(item, unit, locale);
  if (isGrammarPoint(item)) return grammarCard(item, unit, locale);
  return null;
}

function dialogueLineCard(
  line: DialogueLine,
  lineIndex: number,
  scene: DialogueScene,
  unit: HydratedUnit,
  locale: Locale,
): SRSCardBase {
  const lineKey = dialogueLineId(scene.id, lineIndex);
  return {
    id: `srs-${lineKey}`,
    front: line.japanese,
    back: line.translation[locale],
    romaji: line.romaji,
    meaning: line.translation[locale],
    mnemonic: line.note?.[locale],
    type: 'dialogue',
    unitId: unit.id,
    level: unit.level,
    sourceId: lineKey,
  };
}

/** All unique SRS cards from the full hydrated curriculum (all Studio units). */
export function buildCurriculumDeckCatalog(locale: Locale = 'it'): SRSCardBase[] {
  const seen = new Set<string>();
  const cards: SRSCardBase[] = [];

  const add = (card: SRSCardBase | null) => {
    if (!card || seen.has(card.id)) return;
    seen.add(card.id);
    cards.push(card);
  };

  for (const unit of SYLLABUS) {
    for (const k of unit.kana ?? []) add(kanaCard(k, unit, locale));
    for (const k of unit.kanji ?? []) add(kanjiCard(k, unit, locale));
    for (const v of unit.vocab ?? []) add(vocabCard(v, unit, locale));
    for (const g of unit.grammar ?? []) add(grammarCard(g, unit, locale));
    for (const item of unit.reviewPool ?? []) add(poolItemToCard(item, unit, locale));
    for (const scene of unit.dialogues ?? []) {
      scene.lines.forEach((line, lineIndex) => {
        add(dialogueLineCard(line, lineIndex, scene, unit, locale));
      });
    }
  }

  return cards;
}

export const CURRICULUM_DECK_CATALOG = buildCurriculumDeckCatalog('it');

function trackSourceId(ids: Set<string>, sourceId: string | undefined): void {
  if (sourceId) ids.add(sourceId);
}

/** Source ids referenced by units at this level (kana, review pools, dialogues, …). */
export function getLevelSourceIds(level: number): Set<string> {
  const ids = new Set<string>();
  for (const unit of SYLLABUS) {
    if (unit.level !== level) continue;
    for (const k of unit.kana ?? []) trackSourceId(ids, k.id);
    for (const k of unit.kanji ?? []) trackSourceId(ids, k.id);
    for (const v of unit.vocab ?? []) trackSourceId(ids, v.id);
    for (const g of unit.grammar ?? []) trackSourceId(ids, g.id);
    for (const item of unit.reviewPool ?? []) {
      if (isKanaItem(item)) trackSourceId(ids, item.id);
      else if (isKanjiItem(item)) trackSourceId(ids, item.id);
      else if (isVocabItem(item)) trackSourceId(ids, item.id);
      else if (isGrammarPoint(item)) trackSourceId(ids, item.id);
    }
    for (const scene of unit.dialogues ?? []) {
      scene.lines.forEach((_, lineIndex) => {
        trackSourceId(ids, dialogueLineId(scene.id, lineIndex));
      });
    }
  }
  return ids;
}

/** Precomputed: each source id → curriculum levels that reference it (incl. synthesis review pools). */
const SOURCE_LEVEL_INDEX: Map<string, Set<number>> = (() => {
  const index = new Map<string, Set<number>>();
  const add = (sourceId: string, level: number) => {
    if (!index.has(sourceId)) index.set(sourceId, new Set());
    index.get(sourceId)!.add(level);
  };
  for (let level = 0; level <= 12; level++) {
    for (const sourceId of getLevelSourceIds(level)) add(sourceId, level);
  }
  return index;
})();

export function cardBelongsToDeckLevel(
  card: Pick<SRSCardBase, 'level' | 'sourceId'>,
  level: number,
): boolean {
  if (Number(card.level) === level) return true;
  if (!card.sourceId) return false;
  return SOURCE_LEVEL_INDEX.get(card.sourceId)?.has(level) ?? false;
}

export function cardMatchesDeckFilter(
  card: Pick<SRSCardBase, 'level' | 'sourceId' | 'type'>,
  activeLevel: number | 'all',
  activeType: SRSCardType | 'all',
  levelSourceIds: Set<string> | null = null,
): boolean {
  const matchesLevel =
    activeLevel === 'all' ||
    cardBelongsToDeckLevel(card, Number(activeLevel)) ||
    (levelSourceIds?.has(card.sourceId) ?? false);
  const matchesType = activeType === 'all' || card.type === activeType;
  return matchesLevel && matchesType;
}

export function countCardsInDeckFilter(
  cards: Pick<SRSCardBase, 'level' | 'sourceId' | 'type'>[],
  activeLevel: number | 'all',
  activeType: SRSCardType | 'all',
): number {
  const levelSourceIds = activeLevel === 'all' ? null : getLevelSourceIds(Number(activeLevel));
  return cards.filter((card) => cardMatchesDeckFilter(card, activeLevel, activeType, levelSourceIds)).length;
}

export function getDeckStats(cards: { level: number; type: SRSCardType }[]) {
  const byLevel = new Map<number, number>();
  const byType = new Map<SRSCardType, number>();
  for (const c of cards) {
    byLevel.set(c.level, (byLevel.get(c.level) ?? 0) + 1);
    byType.set(c.type, (byType.get(c.type) ?? 0) + 1);
  }
  return { byLevel, byType, total: cards.length };
}
