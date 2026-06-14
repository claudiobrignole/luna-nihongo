import {
  CURRICULUM_LEVELS,
  CURRICULUM_META,
  N5_MAX_LEVEL,
  SYLLABUS,
  getUnitsForLevel,
} from '../data/curriculum';
import type { GrammarPoint, HydratedUnit, Locale } from '../types/curriculum';

type DetailTier = 'summary' | 'standard' | 'full';

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function resolveUnitDetail(
  unit: HydratedUnit,
  completed: boolean,
  focusLevel: number,
): DetailTier {
  if (unit.dialogues?.length || unit.type === 'situation') return 'full';
  if (completed) return 'full';
  if (unit.level > N5_MAX_LEVEL) return 'standard';
  if (Math.abs(unit.level - focusLevel) <= 1) return 'standard';
  return 'summary';
}

function formatGrammar(g: GrammarPoint, language: Locale, detail: DetailTier): string[] {
  const lines: string[] = [];
  if (detail === 'full') {
    lines.push(
      `  Grammar · ${g.title[language]}: ${truncate(g.explanation[language].replace(/\n/g, ' '), 220)}`,
    );
    for (const ex of g.examples.slice(0, 2)) {
      lines.push(`    ex: ${ex.japanese} (${ex.romaji}) — ${ex.translation[language]}`);
    }
    return lines;
  }

  lines.push(`  Grammar · ${g.title[language]}`);
  const ex = g.examples[0];
  if (ex) lines.push(`    ex: ${ex.japanese} (${ex.romaji})`);
  return lines;
}

function formatUnitBlock(
  unit: HydratedUnit,
  language: Locale,
  detail: DetailTier,
  completed: boolean,
): string[] {
  const marker = completed ? '✓' : detail === 'full' ? '★' : detail === 'standard' ? '◆' : '·';
  const lines: string[] = [
    `${marker} ${unit.id} [L${unit.level} ${unit.type}] ${unit.title[language]}`,
  ];

  if (detail === 'summary') {
    lines.push(`  ${truncate(unit.description[language], 140)}`);
    return lines;
  }

  lines.push(`  ${truncate(unit.description[language], 200)}`);

  if (unit.situationTags?.length) {
    lines.push(`  Situation tags: ${unit.situationTags.join(', ')}`);
  }

  for (const canDo of unit.canDo ?? []) {
    const skill = canDo.skill ? ` (${canDo.skill})` : '';
    lines.push(`  Can-do${skill}: ${canDo.statement[language]}`);
  }

  for (const scene of unit.dialogues ?? []) {
    lines.push(`  Dialogue «${scene.title[language]}» — ${scene.setting[language]}`);
    for (const line of scene.lines) {
      const note = line.note?.[language] ? ` [${line.note[language]}]` : '';
      lines.push(
        `    ${line.speakerLabel[language]}: ${line.japanese} / ${line.romaji} / ${line.translation[language]}${note}`,
      );
    }
  }

  for (const g of unit.grammar ?? []) {
    lines.push(...formatGrammar(g, language, detail));
  }

  const vocabLimit = detail === 'full' ? 14 : 6;
  for (const v of unit.vocab?.slice(0, vocabLimit) ?? []) {
    lines.push(`  Vocab: ${v.japanese} = ${v.meaning[language]} (${v.romaji})`);
  }
  if ((unit.vocab?.length ?? 0) > vocabLimit) {
    lines.push(`  … +${unit.vocab!.length - vocabLimit} more vocab in this unit`);
  }

  const kanjiLimit = detail === 'full' ? 10 : 5;
  for (const k of unit.kanji?.slice(0, kanjiLimit) ?? []) {
    const on = k.readingOnyomi.join('·');
    const kun = k.readingKunyomi.join('·');
    lines.push(`  Kanji: ${k.japanese} = ${k.meaning[language]}${on ? ` (on ${on})` : ''}${kun ? ` (kun ${kun})` : ''}`);
  }
  if ((unit.kanji?.length ?? 0) > kanjiLimit) {
    lines.push(`  … +${unit.kanji!.length - kanjiLimit} more kanji in this unit`);
  }

  const kana = unit.kana ?? [];
  if (kana.length > 0) {
    if (kana.length <= 10) {
      for (const k of kana) lines.push(`  Kana: ${k.japanese} = ${k.romaji}`);
    } else {
      lines.push(
        `  Kana: ${kana.length} characters — ${kana
          .slice(0, 6)
          .map((k) => k.japanese)
          .join(' ')} …`,
      );
    }
  }

  for (const item of unit.reviewPool?.slice(0, detail === 'full' ? 8 : 4) ?? []) {
    if ('japanese' in item && 'meaning' in item && 'romaji' in item) {
      lines.push(`  Review: ${item.japanese} = ${item.meaning[language]} (${item.romaji})`);
    } else if ('japanese' in item && 'romaji' in item && 'script' in item) {
      lines.push(`  Review kana: ${item.japanese} (${item.romaji})`);
    }
  }

  return lines;
}

/** Compact index of all situational dialogues for role-play suggestions. */
export function buildDialoguePracticeIndex(language: Locale): string {
  const lines: string[] = [];
  for (const unit of SYLLABUS) {
    if (!unit.dialogues?.length) continue;
    for (const scene of unit.dialogues) {
      lines.push(
        `- ${unit.id} / ${scene.id}: ${scene.title[language]} — ${scene.setting[language]} (${scene.lines.length} lines, L${unit.level})`,
      );
    }
  }
  return lines.join('\n');
}

export function curriculumProgressLabel(language: Locale, completedCount: number): string {
  const total = CURRICULUM_META.unitCount;
  return language === 'it'
    ? `${completedCount}/${total} unità completate`
    : `${completedCount}/${total} units completed`;
}

export function curriculumScopeLabel(language: Locale): string {
  return language === 'it'
    ? `${CURRICULUM_META.unitCount} unità · 13 livelli (0–12) · traccia JLPT N5 (L0–6) + N4 (L7–12)`
    : `${CURRICULUM_META.unitCount} units · 13 levels (0–12) · JLPT N5 track (L0–6) + N4 track (L7–12)`;
}

/**
 * Rich curriculum memory for Luna tutor prompts.
 * ★/✓ = full detail (situation/dialogue units always; completed units).
 * ◆ = standard (N4 track + focus level ±1).
 * · = summary index (title + short description).
 */
export function buildCurriculumKnowledge(
  language: Locale,
  completedUnitIds: string[],
  focusLevel = 0,
): string {
  const completed = new Set(completedUnitIds);
  const lines: string[] = [
    curriculumScopeLabel(language),
    language === 'it'
      ? 'Legenda: ✓ completata · ★ dialogo/situazione (sempre dettagliata) · ◆ livello vicino o N4 · · indice breve'
      : 'Legend: ✓ completed · ★ dialogue/situation (always detailed) · ◆ nearby level or N4 · · brief index',
    '',
    language === 'it' ? '## Indice dialoghi situazionali (role-play)' : '## Situational dialogue index (role-play)',
    buildDialoguePracticeIndex(language),
    '',
  ];

  for (const level of CURRICULUM_LEVELS) {
    lines.push(`## ${level.title[language]}`);
    lines.push(level.description[language]);

    for (const unit of getUnitsForLevel(level.level)) {
      const detail = resolveUnitDetail(unit, completed.has(unit.id), focusLevel);
      lines.push(...formatUnitBlock(unit, language, detail, completed.has(unit.id)));
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}
