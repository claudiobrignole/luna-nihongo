import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { queueTransactionalEmail, resolveUserLanguage } from './mail/sendTransactional';
import {
  isInOneHourWindow,
  isInTeacherAddLinkBeforeLessonWindow,
  isInThirtySixHourWindow,
  reminderQueryRangeIso,
} from './lessonReminderWindows';
import { parseSlotStartMs } from './schedulingRules';
import { teacherDashboardUrl } from './teacherBookings';

const resendApiKey = defineSecret('RESEND_API_KEY');

interface BookingReminderDoc {
  name?: string;
  email?: string;
  date?: string;
  time?: string;
  meetLink?: string | null;
  slotStartAt?: string | null;
  timestamp?: string;
  teacherId?: string;
  teacherEmail?: string;
  teacherDisplayName?: string;
  remindersSent?: {
    thirtySixHours?: string;
    oneHour?: string;
    teacherAddLink?: string;
    dayBefore?: string;
    tenMin?: string;
  };
}

export function resolveBookingSlotStartMs(booking: BookingReminderDoc): number | null {
  if (booking.slotStartAt) {
    const ms = new Date(booking.slotStartAt).getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  const date = String(booking.date ?? '');
  const startTime = String(booking.time ?? '').split('–')[0]?.trim() ?? '';
  return parseSlotStartMs(date, startTime);
}

function meetLinkBlock(meetLink: string | null | undefined, it: boolean): string {
  const link = String(meetLink ?? '').trim();
  if (!link) {
    return `<p style="font-size:14px;color:#666">${it
      ? 'Il link video sarà inviato appena il maestro lo inserirà.'
      : 'The video link will be sent once your teacher adds it.'}</p>`;
  }
  return `<p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#9b59b6;color:#fff;text-decoration:none;border-radius:8px">${it ? 'Apri videochiamata' : 'Open video call'}</a></p>`;
}

export async function processLessonReminders(
  apiKey: string,
  now = Date.now(),
): Promise<{ thirtySixHours: number; oneHour: number; teacherAddLink: number; scanned: number }> {
  const db = getFirestore();
  const { from, to } = reminderQueryRangeIso(now);

  const snap = await db
    .collectionGroup('bookings')
    .where('slotStartAt', '>=', from)
    .where('slotStartAt', '<=', to)
    .get();

  let thirtySixHours = 0;
  let oneHour = 0;
  let teacherAddLink = 0;
  const userCache = new Map<string, Record<string, unknown>>();
  const teacherCache = new Map<string, Record<string, unknown>>();

  for (const doc of snap.docs) {
    const booking = doc.data() as BookingReminderDoc;
    const slotStartMs = resolveBookingSlotStartMs(booking);
    if (slotStartMs === null || slotStartMs <= now) continue;

    const uid = doc.ref.parent.parent?.id;
    if (!uid) continue;

    const email = String(booking.email ?? '').trim();
    const name = String(booking.name ?? '').trim();
    if (!email || !name) continue;

    const remindersSent = booking.remindersSent ?? {};
    const meetLink = String(booking.meetLink ?? '').trim() || null;
    const mailBase = {
      name,
      teacherName: String(booking.teacherDisplayName ?? ''),
      date: String(booking.date ?? ''),
      time: String(booking.time ?? ''),
      meetLink: meetLink ?? '',
    };

    const teacherId = String(booking.teacherId ?? '');
    const teacherEmail = String(booking.teacherEmail ?? '').trim();

    if (
      !meetLink
      && teacherEmail
      && !remindersSent.teacherAddLink
      && isInTeacherAddLinkBeforeLessonWindow(slotStartMs, now)
    ) {
      let teacher = teacherCache.get(teacherId);
      if (!teacher && teacherId) {
        const teacherSnap = await db.collection('users').doc(teacherId).get();
        teacher = teacherSnap.data() ?? {};
        teacherCache.set(teacherId, teacher);
      }

      queueTransactionalEmail({
        apiKey,
        to: teacherEmail,
        language: resolveUserLanguage(teacher ?? {}),
        type: 'teacher_add_link_reminder',
        data: {
          teacherName: String(booking.teacherDisplayName ?? ''),
          studentName: name,
          date: mailBase.date,
          time: mailBase.time,
          dashboardUrl: teacherDashboardUrl(),
        },
      });

      await doc.ref.set(
        {
          remindersSent: {
            ...remindersSent,
            teacherAddLink: new Date(now).toISOString(),
          },
        },
        { merge: true },
      );
      teacherAddLink += 1;
    }

    if (isInThirtySixHourWindow(slotStartMs, now) && !remindersSent.thirtySixHours && !remindersSent.dayBefore) {
      let user = userCache.get(uid);
      if (!user) {
        const userSnap = await db.collection('users').doc(uid).get();
        user = userSnap.data() ?? {};
        userCache.set(uid, user);
      }

      queueTransactionalEmail({
        apiKey,
        to: email,
        language: resolveUserLanguage(user),
        type: 'lesson_reminder_36h',
        data: mailBase,
      });

      if (teacherEmail) {
        let teacher = teacherCache.get(teacherId);
        if (!teacher && teacherId) {
          const teacherSnap = await db.collection('users').doc(teacherId).get();
          teacher = teacherSnap.data() ?? {};
          teacherCache.set(teacherId, teacher);
        }
        queueTransactionalEmail({
          apiKey,
          to: teacherEmail,
          language: resolveUserLanguage(teacher ?? {}),
          type: 'lesson_reminder_36h_teacher',
          data: {
            teacherName: String(booking.teacherDisplayName ?? ''),
            studentName: name,
            date: mailBase.date,
            time: mailBase.time,
            meetLink: meetLink ?? '',
          },
        });
      }

      await doc.ref.set(
        {
          remindersSent: {
            ...remindersSent,
            thirtySixHours: new Date(now).toISOString(),
          },
        },
        { merge: true },
      );
      thirtySixHours += 1;
      continue;
    }

    if (isInOneHourWindow(slotStartMs, now) && !remindersSent.oneHour && !remindersSent.tenMin) {
      let user = userCache.get(uid);
      if (!user) {
        const userSnap = await db.collection('users').doc(uid).get();
        user = userSnap.data() ?? {};
        userCache.set(uid, user);
      }

      queueTransactionalEmail({
        apiKey,
        to: email,
        language: resolveUserLanguage(user),
        type: 'lesson_reminder_1h',
        data: mailBase,
      });

      if (teacherEmail) {
        let teacher = teacherCache.get(teacherId);
        if (!teacher && teacherId) {
          const teacherSnap = await db.collection('users').doc(teacherId).get();
          teacher = teacherSnap.data() ?? {};
          teacherCache.set(teacherId, teacher);
        }
        queueTransactionalEmail({
          apiKey,
          to: teacherEmail,
          language: resolveUserLanguage(teacher ?? {}),
          type: 'lesson_reminder_1h_teacher',
          data: {
            teacherName: String(booking.teacherDisplayName ?? ''),
            studentName: name,
            date: mailBase.date,
            time: mailBase.time,
            meetLink: meetLink ?? '',
          },
        });
      }

      await doc.ref.set(
        {
          remindersSent: {
            ...remindersSent,
            oneHour: new Date(now).toISOString(),
          },
        },
        { merge: true },
      );
      oneHour += 1;
    }
  }

  return { thirtySixHours, oneHour, teacherAddLink, scanned: snap.size };
}

export const sendLessonReminders = onSchedule(
  {
    schedule: 'every 5 minutes',
    region: 'europe-west1',
    timeZone: 'Europe/Zurich',
    secrets: [resendApiKey],
  },
  async () => {
    const result = await processLessonReminders(resendApiKey.value());
    if (result.thirtySixHours > 0 || result.oneHour > 0 || result.teacherAddLink > 0) {
      console.log('Lesson reminders sent', result);
    }
  },
);

export { meetLinkBlock };
