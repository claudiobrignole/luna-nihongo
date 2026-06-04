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

/** Macro-levels (0–6) for grouped UI. */
export const CURRICULUM_LEVELS: SyllabusLevel[] = data.levels;

export const CURRICULUM_META = {
  schemaVersion: data.schemaVersion,
  targetLevel: data.targetLevel,
  builtAt: data.builtAt,
  unitCount: data.units.length,
};
