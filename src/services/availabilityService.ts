import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';
import type { AvailabilitySlot, NewAvailabilitySlot, SlotType } from '../types/availability';
import { defaultMaxParticipants } from '../types/availability';

const COLLECTION = 'availabilitySlots';

function docToSlot(id: string, data: Record<string, unknown>): AvailabilitySlot {
  const slotType: SlotType = data.slotType === 'intro' ? 'intro' : 'regular';
  return {
    id,
    date: String(data.date ?? ''),
    startTime: String(data.startTime ?? ''),
    endTime: String(data.endTime ?? ''),
    slotType,
    teacherId: String(data.teacherId ?? ''),
    teacherDisplayName: String(data.teacherDisplayName ?? ''),
    maxParticipants: typeof data.maxParticipants === 'number'
      ? data.maxParticipants
      : defaultMaxParticipants(slotType),
    participantCount: typeof data.participantCount === 'number' ? data.participantCount : 0,
    participantIds: Array.isArray(data.participantIds) ? data.participantIds.map(String) : [],
    active: data.active !== false,
    notes: data.notes ? String(data.notes) : undefined,
    createdAt: String(data.createdAt ?? ''),
    updatedAt: String(data.updatedAt ?? ''),
  };
}

export async function loadAvailabilitySlots(
  options?: {
    slotType?: SlotType;
    fromDate?: string;
    teacherId?: string;
  },
): Promise<AvailabilitySlot[]> {
  const constraints = [where('active', '==', true)];
  if (options?.teacherId) {
    constraints.push(where('teacherId', '==', options.teacherId));
  }
  const q = query(collection(getFirebaseDb(), COLLECTION), ...constraints);
  const snap = await getDocs(q);
  let slots = snap.docs.map((d) => docToSlot(d.id, d.data() as Record<string, unknown>));
  if (options?.slotType) {
    slots = slots.filter((s) => s.slotType === options.slotType);
  }
  if (options?.fromDate) {
    const fromDate = options.fromDate;
    slots = slots.filter((s) => s.date >= fromDate);
  }
  return slots.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}

export async function loadAllAvailabilitySlotsAdmin(teacherId?: string): Promise<AvailabilitySlot[]> {
  const q = teacherId
    ? query(collection(getFirebaseDb(), COLLECTION), where('teacherId', '==', teacherId))
    : collection(getFirebaseDb(), COLLECTION);
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => docToSlot(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}

export async function createAvailabilitySlot(input: NewAvailabilitySlot): Promise<AvailabilitySlot> {
  const id = `slot-${Date.now()}`;
  const now = new Date().toISOString();
  const slot: AvailabilitySlot = {
    ...input,
    id,
    maxParticipants: input.maxParticipants ?? defaultMaxParticipants(input.slotType),
    participantCount: 0,
    participantIds: [],
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(getFirebaseDb(), COLLECTION, id), {
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    slotType: slot.slotType,
    teacherId: slot.teacherId,
    teacherDisplayName: slot.teacherDisplayName,
    maxParticipants: slot.maxParticipants,
    participantCount: 0,
    participantIds: [],
    active: slot.active,
    notes: slot.notes ?? '',
    createdAt: now,
    updatedAt: now,
  });

  return slot;
}

export async function deleteAvailabilitySlot(slotId: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), COLLECTION, slotId));
}

export async function toggleAvailabilitySlot(slotId: string, active: boolean): Promise<void> {
  await setDoc(
    doc(getFirebaseDb(), COLLECTION, slotId),
    { active, updatedAt: new Date().toISOString() },
    { merge: true },
  );
}
