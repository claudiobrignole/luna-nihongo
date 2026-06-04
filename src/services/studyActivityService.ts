import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';
import type { StudyActivity, StudyActivityType } from '../types/study';

export interface LogStudyActivityInput {
  type: StudyActivityType;
  label: string;
  unitId?: string;
  level?: number;
  meta?: Record<string, string | number>;
}

function activityCollection(userId: string) {
  return collection(getFirebaseDb(), 'users', userId, 'activity');
}

export async function logStudyActivity(
  userId: string,
  input: LogStudyActivityInput,
): Promise<void> {
  try {
    await addDoc(activityCollection(userId), {
      type: input.type,
      label: input.label,
      unitId: input.unitId ?? null,
      level: input.level ?? null,
      meta: input.meta ?? null,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to log study activity', err);
  }
}

export async function listStudyActivity(
  userId: string,
  maxItems = 80,
): Promise<StudyActivity[]> {
  const q = query(
    activityCollection(userId),
    orderBy('createdAt', 'desc'),
    limit(maxItems),
  );
  const snap = await getDocs(q);

  return snap.docs.map((docSnap) => {
    const data = docSnap.data();
    const ts = data.createdAt as Timestamp | undefined;
    return {
      id: docSnap.id,
      type: data.type as StudyActivityType,
      label: String(data.label ?? ''),
      unitId: data.unitId ?? undefined,
      level: data.level ?? undefined,
      meta: data.meta ?? undefined,
      createdAt: ts?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    };
  });
}
