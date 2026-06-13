import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { assertAdmin } from './adminAuth';
import { cancelBookingByLuna } from './lunaCancel';

const resendApiKey = defineSecret('RESEND_API_KEY');

export const adminCancelBooking = onCall(
  {
    region: 'europe-west1',
    secrets: [resendApiKey],
    invoker: 'public',
  },
  async (request) => {
    await assertAdmin(request);

    const targetUid = typeof request.data?.targetUid === 'string' ? request.data.targetUid.trim() : '';
    const bookingId = typeof request.data?.bookingId === 'string' ? request.data.bookingId.trim() : '';
    const reason = typeof request.data?.reason === 'string' ? request.data.reason.trim() : '';

    if (!targetUid || !bookingId) {
      throw new HttpsError('invalid-argument', 'targetUid and bookingId are required.');
    }

    return cancelBookingByLuna({
      targetUid,
      bookingId,
      reason,
      resendApiKey: resendApiKey.value(),
    });
  },
);

export const adminDeactivateSlot = onCall(
  {
    region: 'europe-west1',
    secrets: [resendApiKey],
    invoker: 'public',
  },
  async (request) => {
    await assertAdmin(request);

    const slotId = typeof request.data?.slotId === 'string' ? request.data.slotId.trim() : '';
    const reason = typeof request.data?.reason === 'string' ? request.data.reason.trim() : '';

    if (!slotId) {
      throw new HttpsError('invalid-argument', 'slotId is required.');
    }

    const db = getFirestore();
    const slotRef = db.collection('availabilitySlots').doc(slotId);
    const slotSnap = await slotRef.get();
    if (!slotSnap.exists) {
      throw new HttpsError('not-found', 'Slot not found.');
    }

    const slot = slotSnap.data() ?? {};
    const participantIds: string[] = Array.isArray(slot.participantIds) ? slot.participantIds : [];
    const cancelled: { uid: string; bookingId: string; discountCode?: string }[] = [];

    for (const uid of participantIds) {
      const bookingsSnap = await db
        .collection('users')
        .doc(uid)
        .collection('bookings')
        .where('slotId', '==', slotId)
        .get();

      for (const bookingDoc of bookingsSnap.docs) {
        const result = await cancelBookingByLuna({
          targetUid: uid,
          bookingId: bookingDoc.id,
          reason: reason || 'Slot deactivated by Luna',
          resendApiKey: resendApiKey.value(),
        });
        cancelled.push({ uid, bookingId: bookingDoc.id, discountCode: result.discountCode });
      }
    }

    await slotRef.set(
      { active: false, updatedAt: new Date().toISOString() },
      { merge: true },
    );

    return { ok: true, cancelled: cancelled.length, results: cancelled };
  },
);
