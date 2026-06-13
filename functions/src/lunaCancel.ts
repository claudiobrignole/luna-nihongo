import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { issueCoupon } from './coupons';
import { queueTransactionalEmail, resolveUserLanguage } from './mail/sendTransactional';
import { releaseBookingForUser } from './schedulingRelease';

const APP_ORIGIN = 'https://lunanihongo.com';
const LUNA_EXTRA_DISCOUNT_PERCENT = 20;

export async function cancelBookingByLuna(input: {
  targetUid: string;
  bookingId: string;
  reason?: string;
  resendApiKey: string;
}): Promise<{ ok: true; discountCode: string }> {
  const { targetUid, bookingId, reason, resendApiKey } = input;
  const db = getFirestore();
  const userRef = db.collection('users').doc(targetUid);
  const bookingRef = userRef.collection('bookings').doc(bookingId);
  const [bookingSnap, userSnap] = await Promise.all([bookingRef.get(), userRef.get()]);

  if (!bookingSnap.exists) {
    throw new HttpsError('not-found', 'Booking not found.');
  }
  if (!userSnap.exists) {
    throw new HttpsError('not-found', 'User not found.');
  }

  const booking = bookingSnap.data() ?? {};
  const user = userSnap.data() ?? {};

  const released = await releaseBookingForUser(targetUid, bookingId, booking, 'admin', {
    skipTimeCheck: true,
  });

  const { code: discountCode } = await issueCoupon({
    type: 'percent_off_extra',
    source: 'luna_cancelled',
    percentOff: LUNA_EXTRA_DISCOUNT_PERCENT,
    redeemedByUid: targetUid,
    sourceBookingId: bookingId,
    note: reason || 'Cancelled by Luna',
  });

  queueTransactionalEmail({
    apiKey: resendApiKey,
    to: released.email,
    language: resolveUserLanguage(user),
    type: 'lesson_cancelled_by_luna',
    data: {
      name: released.name,
      date: released.date,
      time: released.time,
      meetLink: String(booking.meetLink ?? ''),
      reason: reason ?? '',
      discountCode,
      discountPercent: LUNA_EXTRA_DISCOUNT_PERCENT,
      bookingUrl: `${APP_ORIGIN}/?book=regular`,
    },
  });

  return { ok: true, discountCode };
}
