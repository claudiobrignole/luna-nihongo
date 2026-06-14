import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { queueTransactionalEmail, resolveUserLanguage } from './mail/sendTransactional';
import { assertStaff, assertSuperAdmin } from './adminAuth';
import type { TeacherBookingMailData } from './schedulingTypes';

const resendApiKey = defineSecret('RESEND_API_KEY');
const APP_ORIGIN = 'https://lunanihongo.com';

function isValidMeetUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export const setBookingMeetLink = onCall(
  {
    region: 'europe-west1',
    secrets: [resendApiKey],
    invoker: 'public',
  },
  async (request) => {
    const staff = await assertStaff(request);
    const studentUid = typeof request.data?.studentUid === 'string' ? request.data.studentUid.trim() : '';
    const bookingId = typeof request.data?.bookingId === 'string' ? request.data.bookingId.trim() : '';
    const meetLink = typeof request.data?.meetLink === 'string' ? request.data.meetLink.trim() : '';

    if (!studentUid || !bookingId || !meetLink) {
      throw new HttpsError('invalid-argument', 'studentUid, bookingId and meetLink are required.');
    }
    if (!isValidMeetUrl(meetLink)) {
      throw new HttpsError('invalid-argument', 'meetLink must be a valid URL.');
    }

    const db = getFirestore();
    const bookingRef = db.collection('users').doc(studentUid).collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      throw new HttpsError('not-found', 'Booking not found.');
    }

    const booking = bookingSnap.data() ?? {};
    const teacherId = String(booking.teacherId ?? '');
    if (staff.role === 'teacher' && teacherId !== staff.uid) {
      throw new HttpsError('permission-denied', 'You can only update your own lessons.');
    }

    const now = new Date().toISOString();
    await bookingRef.set({ meetLink, meetLinkSetAt: now }, { merge: true });

    const studentSnap = await db.collection('users').doc(studentUid).get();
    const student = studentSnap.data() ?? {};

    queueTransactionalEmail({
      apiKey: resendApiKey.value(),
      to: String(booking.email ?? student.email ?? ''),
      language: resolveUserLanguage(student),
      type: 'booking_link_added',
      data: {
        name: String(booking.name ?? student.username ?? ''),
        teacherName: String(booking.teacherDisplayName ?? ''),
        date: String(booking.date ?? ''),
        time: String(booking.time ?? ''),
        meetLink,
        plan: String(booking.price ?? ''),
      },
    });

    const teacherEmail = String(booking.teacherEmail ?? '');
    if (teacherEmail) {
      const teacherSnap = teacherId ? await db.collection('users').doc(teacherId).get() : null;
      queueTransactionalEmail({
        apiKey: resendApiKey.value(),
        to: teacherEmail,
        language: resolveUserLanguage(teacherSnap?.data() ?? {}),
        type: 'booking_link_added_teacher',
        data: {
          teacherName: String(booking.teacherDisplayName ?? ''),
          studentName: String(booking.name ?? ''),
          date: String(booking.date ?? ''),
          time: String(booking.time ?? ''),
          meetLink,
        },
      });
    }

    return { ok: true, meetLink, meetLinkSetAt: now };
  },
);

export const setTeacherPayoutStatus = onCall(
  {
    region: 'europe-west1',
    invoker: 'public',
  },
  async (request) => {
    const uid = await assertSuperAdmin(request);
    const teacherId = typeof request.data?.teacherId === 'string' ? request.data.teacherId.trim() : '';
    const monthKey = typeof request.data?.monthKey === 'string' ? request.data.monthKey.trim() : '';
    const status = request.data?.status;
    const lessonCount = typeof request.data?.lessonCount === 'number' ? request.data.lessonCount : 0;

    if (!teacherId || !monthKey || (status !== 'pending_invoice' && status !== 'paid')) {
      throw new HttpsError('invalid-argument', 'teacherId, monthKey and valid status are required.');
    }

    const amountEur = lessonCount * 33;
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      status,
      lessonCount,
      amountEur,
      updatedAt: now,
      updatedBy: uid,
    };
    if (status === 'paid') {
      payload.paidAt = now;
    }

    await getFirestore()
      .collection('teacherPayouts')
      .doc(teacherId)
      .collection('months')
      .doc(monthKey)
      .set(payload, { merge: true });

    return { ok: true, ...payload, monthKey };
  },
);

export function teacherDashboardUrl(): string {
  return `${APP_ORIGIN}/?tab=teacher-dashboard`;
}

export function notifyTeacherNewBooking(
  apiKey: string,
  teacherEmail: string,
  teacherData: Record<string, unknown>,
  data: TeacherBookingMailData,
): void {
  if (!teacherEmail) return;
  queueTransactionalEmail({
    apiKey,
    to: teacherEmail,
    language: resolveUserLanguage(teacherData),
    type: 'teacher_booking_new',
    data: {
      ...data,
      dashboardUrl: teacherDashboardUrl(),
    },
  });
}
