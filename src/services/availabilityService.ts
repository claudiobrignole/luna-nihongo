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
  slotType?: SlotType,
  fromDate?: string,
): Promise<AvailabilitySlot[]> {
  const q = query(collection(getFirebaseDb(), COLLECTION), where('active', '==', true));
  const snap = await getDocs(q);
  let slots = snap.docs.map((d) => docToSlot(d.id, d.data() as Record<string, unknown>));
  if (slotType) {
    slots = slots.filter((s) => s.slotType === slotType);
  }
  if (fromDate) {
    slots = slots.filter((s) => s.date >= fromDate);
  }
  return slots.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}

export async function loadAllAvailabilitySlotsAdmin(): Promise<AvailabilitySlot[]> {
  const snap = await getDocs(collection(getFirebaseDb(), COLLECTION));
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
