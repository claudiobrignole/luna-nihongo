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

export function defaultMaxParticipants(slotType: SlotType): number {
  return slotType === 'intro' ? INTRO_MAX_PARTICIPANTS : REGULAR_MAX_PARTICIPANTS;
}

export function formatSlotLabel(slot: Pick<AvailabilitySlot, 'startTime' | 'endTime'>): string {
  return `${slot.startTime} – ${slot.endTime}`;
}

export function slotSeatsLeft(slot: Pick<AvailabilitySlot, 'maxParticipants' | 'participantCount'>): number {
  return Math.max(0, slot.maxParticipants - slot.participantCount);
}
