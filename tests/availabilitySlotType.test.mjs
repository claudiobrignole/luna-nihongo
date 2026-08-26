import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Mirrors oppositeSlotType in src/types/availability.ts */
function oppositeSlotType(slotType) {
  return slotType === 'intro' ? 'regular' : 'intro';
}

/** Mirrors otherModeAvailabilityHint in src/types/availability.ts */
function otherModeAvailabilityHint(language, currentSlotType) {
  if (language === 'en') {
    return currentSlotType === 'intro'
      ? 'There is availability for 60′ lessons, not for this mode (free trial).'
      : 'There is availability for the free trial, not for this mode (60′ lessons).';
  }
  return currentSlotType === 'intro'
    ? 'Ci sono disponibilità per lezioni 60′, non per questa modalità (prova gratuita).'
    : 'Ci sono disponibilità per la prova gratuita, non per questa modalità.';
}

test('teacher create form defaults to regular (matches Prenota lezione)', () => {
  const availability = readFileSync(join(ROOT, 'src/types/availability.ts'), 'utf8');
  assert.match(availability, /DEFAULT_TEACHER_SLOT_TYPE:\s*SlotType\s*=\s*'regular'/);

  const panel = readFileSync(join(ROOT, 'src/components/AdminAvailabilityPanel.tsx'), 'utf8');
  assert.match(panel, /useState<SlotType>\(DEFAULT_TEACHER_SLOT_TYPE\)/);
  assert.doesNotMatch(panel, /useState<SlotType>\('intro'\)/);
});

test('oppositeSlotType flips intro and regular', () => {
  assert.equal(oppositeSlotType('intro'), 'regular');
  assert.equal(oppositeSlotType('regular'), 'intro');
});

test('otherModeAvailabilityHint points students to the other booking mode', () => {
  assert.match(otherModeAvailabilityHint('it', 'regular'), /prova gratuita/);
  assert.match(otherModeAvailabilityHint('it', 'intro'), /lezioni 60′/);
  assert.match(otherModeAvailabilityHint('en', 'regular'), /free trial/);
  assert.match(otherModeAvailabilityHint('en', 'intro'), /60′ lessons/);
});
