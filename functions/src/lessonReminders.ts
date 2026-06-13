import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { queueTransactionalEmail, resolveUserLanguage } from './mail/sendTransactional';
import {
  isInDayBeforeWindow,
  isInTenMinWindow,
  reminderQueryRangeIso,
} from './lessonReminderWindows';
import { parseSlotStartMs } from './schedulingRules';

const resendApiKey = defineSecret('RESEND_API_KEY');

interface BookingReminderDoc {
  name?: string;
  email?: string;
  date?: string;
  time?: string;
  meetLink?: string;
  slotStartAt?: string | null;
  remindersSent?: {
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

export async function processLessonReminders(
  apiKey: string,
  now = Date.now(),
): Promise<{ dayBefore: number; tenMin: number; scanned: number }> {
  const db = getFirestore();
  const { from, to } = reminderQueryRangeIso(now);

  const snap = await db
    .collectionGroup('bookings')
    .where('slotStartAt', '>=', from)
    .where('slotStartAt', '<=', to)
    .get();

  let dayBefore = 0;
  let tenMin = 0;
  const userCache = new Map<string, Record<string, unknown>>();

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
    const mailBase = {
      name,
      date: String(booking.date ?? ''),
      time: String(booking.time ?? ''),
      meetLink: String(booking.meetLink ?? ''),
    };

    if (isInDayBeforeWindow(slotStartMs, now) && !remindersSent.dayBefore) {
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
        type: 'lesson_reminder_day_before',
        data: mailBase,
      });

      await doc.ref.set(
        {
          remindersSent: {
            ...remindersSent,
            dayBefore: new Date(now).toISOString(),
          },
        },
        { merge: true },
      );
      dayBefore += 1;
      continue;
    }

    if (isInTenMinWindow(slotStartMs, now) && !remindersSent.tenMin) {
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
        type: 'lesson_reminder_ten_min',
        data: mailBase,
      });

      await doc.ref.set(
        {
          remindersSent: {
            ...remindersSent,
            tenMin: new Date(now).toISOString(),
          },
        },
        { merge: true },
      );
      tenMin += 1;
    }
  }

  return { dayBefore, tenMin, scanned: snap.size };
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
    if (result.dayBefore > 0 || result.tenMin > 0) {
      console.log('Lesson reminders sent', result);
    }
  },
);
