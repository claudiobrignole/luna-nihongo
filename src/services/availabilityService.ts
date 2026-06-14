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
  const filterSlots = (slots: AvailabilitySlot[]) => {
    let result = slots;
    if (options?.slotType) {
      result = result.filter((s) => s.slotType === options.slotType);
    }
    if (options?.fromDate) {
      const fromDate = options.fromDate;
      result = result.filter((s) => s.date >= fromDate);
    }
    if (options?.teacherId) {
      result = result.filter((s) => s.teacherId === options.teacherId);
    }
    return result.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  };

  try {
    const constraints = [where('active', '==', true)];
    if (options?.teacherId) {
      constraints.push(where('teacherId', '==', options.teacherId));
    }
    const q = query(collection(getFirebaseDb(), COLLECTION), ...constraints);
    const snap = await getDocs(q);
    return filterSlots(snap.docs.map((d) => docToSlot(d.id, d.data() as Record<string, unknown>)));
  } catch (err) {
    console.warn('Indexed slot query failed, falling back to client filter', err);
    const snap = await getDocs(
      query(collection(getFirebaseDb(), COLLECTION), where('active', '==', true)),
    );
    return filterSlots(snap.docs.map((d) => docToSlot(d.id, d.data() as Record<string, unknown>)));
  }
}

/** Teachers with published slots — works for any signed-in student (no users collection read). */
export async function listTeachersFromAvailabilitySlots(
  options?: { slotType?: SlotType; fromDate?: string },
): Promise<Array<{ id: string; username: string; teacherDisplayName?: string }>> {
  const slots = await loadAvailabilitySlots(options);
  const map = new Map<string, { id: string; username: string; teacherDisplayName?: string }>();
  for (const slot of slots) {
    if (!slot.teacherId) continue;
    if (!map.has(slot.teacherId)) {
      map.set(slot.teacherId, {
        id: slot.teacherId,
        username: slot.teacherDisplayName || 'Maestro/a',
        teacherDisplayName: slot.teacherDisplayName || undefined,
      });
    }
  }
  return [...map.values()].sort((a, b) =>
    (a.teacherDisplayName ?? a.username).localeCompare(b.teacherDisplayName ?? b.username, 'it', {
      sensitivity: 'base',
    }),
  );
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
