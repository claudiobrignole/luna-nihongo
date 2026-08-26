export type SlotType = 'intro' | 'regular';

export interface AvailabilitySlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  slotType: SlotType;
  teacherId: string;
  teacherDisplayName: string;
  maxParticipants: number;
  participantCount: number;
  participantIds: string[];
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type NewAvailabilitySlot = Omit<
  AvailabilitySlot,
  'id' | 'participantCount' | 'participantIds' | 'createdAt' | 'updatedAt'
>;

export const INTRO_SLOT_DURATION_MINUTES = 30;
export const INTRO_MAX_PARTICIPANTS = 5;
export const REGULAR_MAX_PARTICIPANTS = 1;

/** Default when teachers create slots — matches student “Prenota lezione” (regular 60′). */
export const DEFAULT_TEACHER_SLOT_TYPE: SlotType = 'regular';

export function defaultMaxParticipants(slotType: SlotType): number {
  return slotType === 'intro' ? INTRO_MAX_PARTICIPANTS : REGULAR_MAX_PARTICIPANTS;
}

export function oppositeSlotType(slotType: SlotType): SlotType {
  return slotType === 'intro' ? 'regular' : 'intro';
}

/** Empty-state hint when the teacher has active slots of the other booking mode only. */
export function otherModeAvailabilityHint(
  language: 'en' | 'it',
  currentSlotType: SlotType,
): string {
  if (language === 'en') {
    return currentSlotType === 'intro'
      ? 'There is availability for 60′ lessons, not for this mode (free trial).'
      : 'There is availability for the free trial, not for this mode (60′ lessons).';
  }
  return currentSlotType === 'intro'
    ? 'Ci sono disponibilità per lezioni 60′, non per questa modalità (prova gratuita).'
    : 'Ci sono disponibilità per la prova gratuita, non per questa modalità.';
}

export function formatSlotLabel(slot: Pick<AvailabilitySlot, 'startTime' | 'endTime'>): string {
  return `${slot.startTime} – ${slot.endTime}`;
}

export function slotSeatsLeft(slot: Pick<AvailabilitySlot, 'maxParticipants' | 'participantCount'>): number {
  return Math.max(0, slot.maxParticipants - slot.participantCount);
}
