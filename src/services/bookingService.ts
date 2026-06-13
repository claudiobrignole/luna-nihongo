import {
  collection,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';
import type { BookedLesson } from '../types/booking';

function bookingsCollection(userId: string) {
  return collection(getFirebaseDb(), 'users', userId, 'bookings');
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
    plan: (['trial_intro', 'included', 'extra', 'extra_rebook', 'coupon', 'replacement'].includes(
      String(data.plan),
    )
      ? String(data.plan)
      : data.plan === 'subscription'
        ? 'included'
        : 'extra') as BookedLesson['plan'],
    slotId: data.slotId ? String(data.slotId) : undefined,
    slotType: data.slotType === 'intro' ? 'intro' : data.slotType === 'regular' ? 'regular' : undefined,
    meetLink: String(data.meetLink ?? ''),
    price: String(data.price ?? ''),
    timestamp: String(data.timestamp ?? new Date().toISOString()),
    slotStartAt: data.slotStartAt ? String(data.slotStartAt) : null,
    couponId: data.couponId ? String(data.couponId) : null,
  };
}

/** Bookings are created server-side via Cloud Functions (bookAvailabilitySlot / Stripe). */
export async function loadBookings(userId: string): Promise<BookedLesson[]> {
  const q = query(bookingsCollection(userId), orderBy('timestamp', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) =>
    docToBooking(docSnap.id, docSnap.data() as Record<string, unknown>),
  );
}
