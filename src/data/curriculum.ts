import bundle from '../../content/curriculum/build/curriculum.json';
import type { HydratedUnit, SyllabusLevel } from '../types/curriculum';

interface CurriculumBundle {
  schemaVersion: string;
  targetLevel: string;
  builtAt: string;
  levels: SyllabusLevel[];
  units: HydratedUnit[];
}

const data = bundle as CurriculumBundle;

/** Canonical ordered units — same sequence as manifest.unitOrder after hydration. */
export const SYLLABUS: HydratedUnit[] = data.units;

/** Last macro-level index that belongs to the N5 track (levels 0–6). */
export const N5_MAX_LEVEL = 6;

/** Macro-levels (0–12) for grouped UI. */
export const CURRICULUM_LEVELS: SyllabusLevel[] = data.levels;

const syllabusOrderIndex = new Map(SYLLABUS.map((unit, index) => [unit.id, index]));

/** Units for a level in manifest.unitOrder sequence (never sorted by per-unit `order` field). */
export function getUnitsForLevel(level: number): HydratedUnit[] {
  return SYLLABUS.filter((unit) => unit.level === level).sort(
    (a, b) => (syllabusOrderIndex.get(a.id) ?? 0) - (syllabusOrderIndex.get(b.id) ?? 0),
  );
}

export function unitCountForLevel(level: number): number {
  return getUnitsForLevel(level).length;
}

export const CURRICULUM_META = {
  schemaVersion: data.schemaVersion,
  targetLevel: data.targetLevel,
  builtAt: data.builtAt,
  unitCount: data.units.length,
};
