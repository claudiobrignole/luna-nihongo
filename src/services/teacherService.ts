import { collection, collectionGroup, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp, getFirebaseDb } from '../lib/firebase';
import type { TeacherBookingView, TeacherPayoutMonth, BookableTeacher } from '../types/teacher';
import { TEACHER_LESSON_PAYOUT_EUR, monthKeyFromDate } from '../types/teacher';
import type { BookingPlan } from '../types/booking';
import type { SlotType } from '../types/availability';
import { ensureFreshAuthToken } from './authCallable';
import { listTeachersFromAvailabilitySlots } from './availabilityService';

function docToTeacherBooking(
  id: string,
  studentUid: string,
  data: Record<string, unknown>,
): TeacherBookingView {
  return {
    id,
    studentUid,
    name: String(data.name ?? ''),
    email: String(data.email ?? ''),
    level: String(data.level ?? ''),
    notes: data.notes ? String(data.notes) : undefined,
    date: String(data.date ?? ''),
    time: String(data.time ?? ''),
    plan: String(data.plan ?? ''),
    slotId: data.slotId ? String(data.slotId) : undefined,
    slotType: data.slotType === 'intro' ? 'intro' : data.slotType === 'regular' ? 'regular' : undefined,
    meetLink: data.meetLink != null ? String(data.meetLink) : null,
    meetLinkSetAt: data.meetLinkSetAt ? String(data.meetLinkSetAt) : null,
    price: String(data.price ?? ''),
    timestamp: String(data.timestamp ?? ''),
    slotStartAt: data.slotStartAt ? String(data.slotStartAt) : null,
    teacherId: String(data.teacherId ?? ''),
    teacherDisplayName: String(data.teacherDisplayName ?? ''),
    teacherEmail: String(data.teacherEmail ?? ''),
  };
}

export async function listBookableTeachersRemote(): Promise<BookableTeacher[]> {
  await ensureFreshAuthToken();
  const fn = httpsCallable<Record<string, never>, { teachers: Array<BookableTeacher & { role?: string }> }>(
    getFunctions(getFirebaseApp(), 'europe-west1'),
    'listPublicTeachers',
  );
  const result = await fn({});
  return (result.data.teachers ?? []).filter((t) => t.role !== 'super_admin');
}

/** Bookable teachers = those with published slots; callable fallback is role `teacher` only (not super_admin). */
export async function listBookableTeachers(options?: {
  slotType?: SlotType;
  fromDate?: string;
}): Promise<BookableTeacher[]> {
  const fromSlots = await listTeachersFromAvailabilitySlots(options);
  if (fromSlots.length > 0) return fromSlots;

  try {
    return await listBookableTeachersRemote();
  } catch (err) {
    console.warn('listPublicTeachers unavailable', err);
    return [];
  }
}

export async function loadTeacherBookings(teacherId: string): Promise<TeacherBookingView[]> {
  try {
    await ensureFreshAuthToken();
    const fn = httpsCallable<{ teacherId: string }, { bookings: TeacherBookingView[] }>(
      getFunctions(getFirebaseApp(), 'europe-west1'),
      'listTeacherBookings',
    );
    const result = await fn({ teacherId });
    return result.data.bookings ?? [];
  } catch (err) {
    console.warn('listTeacherBookings callable failed, falling back to Firestore', err);
    const q = query(
      collectionGroup(getFirebaseDb(), 'bookings'),
      where('teacherId', '==', teacherId),
    );
    const snap = await getDocs(q);
    const rows = snap.docs.map((d) =>
      docToTeacherBooking(d.id, d.ref.parent.parent?.id ?? '', d.data() as Record<string, unknown>),
    );
    rows.sort((a, b) => String(a.slotStartAt ?? '').localeCompare(String(b.slotStartAt ?? '')));
    return rows;
  }
}

export async function setBookingMeetLinkRemote(
  studentUid: string,
  bookingId: string,
  meetLink: string,
): Promise<void> {
  const fn = httpsCallable(getFunctions(getFirebaseApp(), 'europe-west1'), 'setBookingMeetLink');
  await fn({ studentUid, bookingId, meetLink });
}

export async function setTeacherPayoutStatusRemote(
  teacherId: string,
  monthKey: string,
  status: 'pending_invoice' | 'paid',
  lessonCount: number,
): Promise<void> {
  const fn = httpsCallable(getFunctions(getFirebaseApp(), 'europe-west1'), 'setTeacherPayoutStatus');
  await fn({ teacherId, monthKey, status, lessonCount });
}

export async function loadTeacherPayoutMonth(
  teacherId: string,
  monthKey: string,
): Promise<TeacherPayoutMonth | null> {
  const ref = doc(getFirebaseDb(), 'teacherPayouts', teacherId, 'months', monthKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: monthKey,
    status: data.status as TeacherPayoutMonth['status'],
    lessonCount: typeof data.lessonCount === 'number' ? data.lessonCount : 0,
    amountEur: typeof data.amountEur === 'number' ? data.amountEur : 0,
    updatedAt: String(data.updatedAt ?? ''),
    updatedBy: String(data.updatedBy ?? ''),
    paidAt: data.paidAt ? String(data.paidAt) : null,
  };
}

export async function loadTeacherPayoutMonths(teacherId: string): Promise<TeacherPayoutMonth[]> {
  const snap = await getDocs(collection(getFirebaseDb(), 'teacherPayouts', teacherId, 'months'));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        status: data.status as TeacherPayoutMonth['status'],
        lessonCount: typeof data.lessonCount === 'number' ? data.lessonCount : 0,
        amountEur: typeof data.amountEur === 'number' ? data.amountEur : 0,
        updatedAt: String(data.updatedAt ?? ''),
        updatedBy: String(data.updatedBy ?? ''),
        paidAt: data.paidAt ? String(data.paidAt) : null,
      };
    })
    .sort((a, b) => b.id.localeCompare(a.id));
}

export function countCompletedRegularLessons(bookings: TeacherBookingView[], now = Date.now()): number {
  return bookings.filter((b) => {
    if (b.slotType !== 'regular') return false;
    const start = b.slotStartAt ? new Date(b.slotStartAt).getTime() : NaN;
    return !Number.isNaN(start) && start < now;
  }).length;
}

export function earningsByMonth(
  bookings: TeacherBookingView[],
  now = Date.now(),
): Map<string, number> {
  const map = new Map<string, number>();
  for (const b of bookings) {
    if (b.slotType !== 'regular') continue;
    const start = b.slotStartAt ? new Date(b.slotStartAt).getTime() : NaN;
    if (Number.isNaN(start) || start >= now) continue;
    const key = monthKeyFromDate(b.slotStartAt ?? b.date);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export function payoutAmount(lessonCount: number): number {
  return lessonCount * TEACHER_LESSON_PAYOUT_EUR;
}

export function isUpcomingBooking(booking: TeacherBookingView, now = Date.now()): boolean {
  const start = booking.slotStartAt ? new Date(booking.slotStartAt).getTime() : NaN;
  return !Number.isNaN(start) && start >= now;
}

export function planLabel(plan: string, language: 'en' | 'it'): string {
  const labels: Record<string, { en: string; it: string }> = {
    trial_intro: { en: 'Intro', it: 'Intro' },
    included: { en: 'Included', it: 'Inclusa' },
    extra: { en: 'Extra', it: 'Extra' },
    extra_rebook: { en: 'Extra rebook', it: 'Extra riprenot.' },
    coupon: { en: 'Coupon', it: 'Coupon' },
    replacement: { en: 'Replacement', it: 'Sostitutiva' },
  };
  return labels[plan as BookingPlan]?.[language] ?? plan;
}
