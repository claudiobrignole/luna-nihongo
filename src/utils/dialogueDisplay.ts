import type { CanDo, DialogueLine, DialogueScene, Locale } from '../types/curriculum';

export function dialogueLineId(dialogueId: string, lineIndex: number): string {
  return `${dialogueId}-L${lineIndex}`;
}

export function getSpeakerLabel(line: DialogueLine, language: Locale): string {
  return line.speakerLabel[language] || line.speaker;
}

export function canDoSkillLabel(skill: string | undefined, language: Locale): string {
  const labels: Record<string, { it: string; en: string }> = {
    speaking: { it: 'parlato', en: 'speaking' },
    writing: { it: 'scrittura', en: 'writing' },
    listening: { it: 'ascolto', en: 'listening' },
    reading: { it: 'lettura', en: 'reading' },
  };
  if (!skill) return '';
  return labels[skill]?.[language] ?? skill;
}

export function formatCanDoStatement(canDo: CanDo, language: Locale): string {
  return canDo.statement[language];
}

export function dialogueHasContent(dialogues: DialogueScene[] | undefined): boolean {
  return Boolean(dialogues?.some((scene) => scene.lines.length > 0));
}
