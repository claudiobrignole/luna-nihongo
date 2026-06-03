import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';
import type { BookedLesson, NewBooking } from '../types/booking';

function bookingsCollection(userId: string) {
  return collection(getFirebaseDb(), 'users', userId, 'bookings');
}

function localStorageKey(userId: string): string {
  return `luna_nihongo_bookings_${userId}`;
}

function docToBooking(id: string, data: Record<string, unknown>): BookedLesson {
  return {
    id,
    name: String(data.name ?? ''),
    email: String(data.email ?? ''),
    level: String(data.level ?? 'beginner'),
    notes: data.notes ? String(data.notes) : undefined,
    date: String(data.date ?? ''),
    time: String(data.time ?? ''),
    plan: data.plan === 'subscription' ? 'subscription' : 'single',
    meetLink: String(data.meetLink ?? ''),
    price: String(data.price ?? ''),
    timestamp: String(data.timestamp ?? new Date().toISOString()),
  };
}

async function migrateBookingsFromLocalStorage(userId: string): Promise<boolean> {
  const saved = localStorage.getItem(localStorageKey(userId));
  if (!saved) return false;

  try {
    const bookings: BookedLesson[] = JSON.parse(saved);
    if (!bookings.length) {
      localStorage.removeItem(localStorageKey(userId));
      return false;
    }

    const batch = writeBatch(getFirebaseDb());
    bookings.forEach((booking) => {
      batch.set(doc(getFirebaseDb(), 'users', userId, 'bookings', booking.id), {
        name: booking.name,
        email: booking.email,
        level: booking.level,
        notes: booking.notes ?? '',
        date: booking.date,
        time: booking.time,
        plan: booking.plan,
        meetLink: booking.meetLink,
        price: booking.price,
        timestamp: booking.timestamp,
      });
    });

    await batch.commit();
    localStorage.removeItem(localStorageKey(userId));
    return true;
  } catch (err) {
    console.error('Bookings localStorage migration failed', err);
    return false;
  }
}

export async function loadBookings(userId: string): Promise<BookedLesson[]> {
  const q = query(bookingsCollection(userId), orderBy('timestamp', 'desc'));
  const snap = await getDocs(q);

  if (snap.empty) {
    const migrated = await migrateBookingsFromLocalStorage(userId);
    if (migrated) {
      return loadBookings(userId);
    }
    return [];
  }

  return snap.docs.map((docSnap) =>
    docToBooking(docSnap.id, docSnap.data() as Record<string, unknown>)
  );
}

export async function createBooking(
  userId: string,
  booking: NewBooking
): Promise<BookedLesson> {
  const id = `book-${Date.now()}`;
  const timestamp = new Date().toISOString();
  const record: BookedLesson = { ...booking, id, timestamp };

  await setDoc(doc(getFirebaseDb(), 'users', userId, 'bookings', id), {
    name: record.name,
    email: record.email,
    level: record.level,
    notes: record.notes ?? '',
    date: record.date,
    time: record.time,
    plan: record.plan,
    meetLink: record.meetLink,
    price: record.price,
    timestamp: record.timestamp,
  });

  return record;
}

export async function deleteBooking(
  userId: string,
  bookingId: string
): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), 'users', userId, 'bookings', bookingId));
}
