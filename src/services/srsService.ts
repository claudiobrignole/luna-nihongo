import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';
import {
  INITIAL_CARDS,
  type CardProgress,
  type SRSCard,
} from '../utils/srs';

function srsCollection(userId: string) {
  return collection(getFirebaseDb(), 'users', userId, 'srs');
}

function localStorageKey(userId: string): string {
  return `luna_nihongo_srs_${userId}`;
}

function buildCardsFromProgress(
  progressMap: Record<string, CardProgress>
): SRSCard[] {
  const todayStr = new Date().toISOString().split('T')[0];

  return INITIAL_CARDS.map((card) => {
    const progress = progressMap[card.id];
    return {
      ...card,
      repetitions: progress?.repetitions ?? 0,
      interval: progress?.interval ?? 0,
      easiness: progress?.easiness ?? 2.5,
      dueDate: progress?.dueDate ?? todayStr,
    };
  });
}

async function migrateSRSFromLocalStorage(userId: string): Promise<boolean> {
  const saved = localStorage.getItem(localStorageKey(userId));
  if (!saved) return false;

  try {
    const progressMap: Record<string, CardProgress> = JSON.parse(saved);
    const batch = writeBatch(getFirebaseDb());
    const now = new Date().toISOString();

    Object.entries(progressMap).forEach(([cardId, progress]) => {
      batch.set(doc(getFirebaseDb(), 'users', userId, 'srs', cardId), {
        ...progress,
        updatedAt: now,
      });
    });

    await batch.commit();
    localStorage.removeItem(localStorageKey(userId));
    return true;
  } catch (err) {
    console.error('SRS localStorage migration failed', err);
    return false;
  }
}

export async function loadSRSCards(userId: string): Promise<SRSCard[]> {
  const snap = await getDocs(srsCollection(userId));
  const progressMap: Record<string, CardProgress> = {};

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    progressMap[docSnap.id] = {
      id: docSnap.id,
      repetitions: data.repetitions ?? 0,
      interval: data.interval ?? 0,
      easiness: data.easiness ?? 2.5,
      dueDate: data.dueDate ?? new Date().toISOString().split('T')[0],
    };
  });

  if (snap.empty) {
    const migrated = await migrateSRSFromLocalStorage(userId);
    if (migrated) {
      return loadSRSCards(userId);
    }
  }

  return buildCardsFromProgress(progressMap);
}

export async function saveSRSCardProgress(
  userId: string,
  cardId: string,
  reps: number,
  interval: number,
  easiness: number,
  dueDate: string
): Promise<void> {
  await setDoc(
    doc(getFirebaseDb(), 'users', userId, 'srs', cardId),
    {
      id: cardId,
      repetitions: reps,
      interval,
      easiness,
      dueDate,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}
