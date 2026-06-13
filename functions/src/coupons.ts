import { createHash, randomBytes } from 'crypto';
import { getFirestore, type DocumentReference, type Transaction } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

export type CouponType = 'free_lesson' | 'percent_off_extra';
export type CouponStatus = 'issued' | 'redeemed' | 'used' | 'expired' | 'revoked';
export type CouponSource =
  | 'grace_no_slots'
  | 'luna_cancelled'
  | 'gift'
  | 'manual';

export const COUPON_VALIDITY_DAYS = 60;

export interface CouponRecord {
  codeHash: string;
  codeHint: string;
  type: CouponType;
  status: CouponStatus;
  source: CouponSource;
  percentOff?: number;
  issuedAt: string;
  expiresAt: string;
  redeemedAt?: string | null;
  redeemedByUid?: string | null;
  usedAt?: string | null;
  sourceBookingId?: string | null;
  purchasedByUid?: string | null;
  stripeSessionId?: string | null;
  /** Plaintext share code — only on gift purchases, readable by purchaser in Firestore rules. */
  shareCode?: string | null;
  note?: string | null;
}

export function couponExpiresAt(from = new Date()): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + COUPON_VALIDITY_DAYS);
  return d.toISOString();
}

export function generateCouponCode(): string {
  const raw = randomBytes(5).toString('hex').toUpperCase();
  return `LUNA-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

export function hashCouponCode(code: string): string {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, '');
  return createHash('sha256').update(`luna-coupon-v1:${normalized}`).digest('hex');
}

export function couponCodeHint(code: string): string {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, '');
  return normalized.slice(-4);
}

export function createCouponPayload(input: {
  code: string;
  type: CouponType;
  source: CouponSource;
  percentOff?: number;
  sourceBookingId?: string;
  note?: string;
  redeemedByUid?: string;
}): CouponRecord {
  const now = new Date().toISOString();
  const redeemed = Boolean(input.redeemedByUid);
  return {
    codeHash: hashCouponCode(input.code),
    codeHint: couponCodeHint(input.code),
    type: input.type,
    status: redeemed ? 'redeemed' : 'issued',
    source: input.source,
    percentOff: input.percentOff,
    issuedAt: now,
    expiresAt: couponExpiresAt(),
    redeemedAt: redeemed ? now : null,
    redeemedByUid: input.redeemedByUid ?? null,
    usedAt: null,
    sourceBookingId: input.sourceBookingId ?? null,
    note: input.note ?? null,
  };
}

export async function issueCoupon(input: {
  type: CouponType;
  source: CouponSource;
  percentOff?: number;
  redeemedByUid?: string;
  sourceBookingId?: string;
  note?: string;
}): Promise<{ couponId: string; code: string }> {
  const db = getFirestore();
  const code = generateCouponCode();
  const couponId = `cpn-${Date.now()}-${randomBytes(3).toString('hex')}`;
  const payload = createCouponPayload({ ...input, code });

  await db.collection('coupons').doc(couponId).set(payload);
  return { couponId, code };
}

export async function issueGiftCouponForPurchase(input: {
  purchasedByUid: string;
  stripeSessionId: string;
}): Promise<{ couponId: string; code: string; created: boolean }> {
  const db = getFirestore();
  const existing = await db
    .collection('coupons')
    .where('stripeSessionId', '==', input.stripeSessionId)
    .limit(1)
    .get();

  if (!existing.empty) {
    const doc = existing.docs[0];
    const data = doc.data() as CouponRecord;
    return {
      couponId: doc.id,
      code: String(data.shareCode ?? ''),
      created: false,
    };
  }

  const code = generateCouponCode();
  const couponId = `cpn-${Date.now()}-${randomBytes(3).toString('hex')}`;
  const payload: CouponRecord = {
    ...createCouponPayload({
      code,
      type: 'free_lesson',
      source: 'gift',
    }),
    purchasedByUid: input.purchasedByUid,
    stripeSessionId: input.stripeSessionId,
    shareCode: code,
  };

  await db.collection('coupons').doc(couponId).set(payload);
  return { couponId, code, created: true };
}

export async function assertCouponLessonRedeemable(
  tx: Transaction,
  couponId: string,
  uid: string,
): Promise<{ couponRef: DocumentReference; coupon: CouponRecord }> {
  const db = getFirestore();
  const couponRef = db.collection('coupons').doc(couponId);
  const snap = await tx.get(couponRef);
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Coupon not found.');
  }

  const coupon = snap.data() as CouponRecord;
  if (coupon.type !== 'free_lesson') {
    throw new HttpsError('failed-precondition', 'This coupon cannot be used for a free lesson.');
  }
  if (coupon.status !== 'redeemed') {
    throw new HttpsError('failed-precondition', 'Coupon is not active.');
  }
  if (coupon.redeemedByUid !== uid) {
    throw new HttpsError('permission-denied', 'Coupon belongs to another account.');
  }
  if (new Date(coupon.expiresAt).getTime() <= Date.now()) {
    throw new HttpsError('failed-precondition', 'Coupon has expired.');
  }

  return { couponRef, coupon };
}

export async function markCouponLessonUsed(
  tx: Transaction,
  couponRef: DocumentReference,
): Promise<void> {
  tx.update(couponRef, {
    status: 'used',
    usedAt: new Date().toISOString(),
  });
}

export async function assertPercentOffCouponRedeemable(
  couponId: string,
  uid: string,
): Promise<CouponRecord & { couponId: string }> {
  const db = getFirestore();
  const snap = await db.collection('coupons').doc(couponId).get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Coupon not found.');
  }

  const coupon = snap.data() as CouponRecord;
  if (coupon.type !== 'percent_off_extra') {
    throw new HttpsError('failed-precondition', 'This coupon is not valid for extra lessons.');
  }
  if (coupon.status !== 'redeemed') {
    throw new HttpsError('failed-precondition', 'Coupon is not active.');
  }
  if (coupon.redeemedByUid !== uid) {
    throw new HttpsError('permission-denied', 'Coupon belongs to another account.');
  }
  if (new Date(coupon.expiresAt).getTime() <= Date.now()) {
    throw new HttpsError('failed-precondition', 'Coupon has expired.');
  }

  return { ...coupon, couponId: snap.id };
}

export async function markCouponDiscountUsed(couponId: string): Promise<void> {
  await getFirestore().collection('coupons').doc(couponId).update({
    status: 'used',
    usedAt: new Date().toISOString(),
  });
}

export async function redeemCouponForUser(
  uid: string,
  code: string,
): Promise<{ couponId: string; type: CouponType; expiresAt: string }> {
  const db = getFirestore();
  const codeHash = hashCouponCode(code);
  const snap = await db
    .collection('coupons')
    .where('codeHash', '==', codeHash)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new HttpsError('not-found', 'Invalid coupon code.');
  }

  const doc = snap.docs[0];
  const coupon = doc.data() as CouponRecord;

  if (coupon.status !== 'issued') {
    throw new HttpsError('failed-precondition', 'Coupon already used or no longer valid.');
  }
  if (new Date(coupon.expiresAt).getTime() <= Date.now()) {
    throw new HttpsError('failed-precondition', 'Coupon has expired.');
  }

  const now = new Date().toISOString();
  await doc.ref.update({
    status: 'redeemed',
    redeemedAt: now,
    redeemedByUid: uid,
  });

  return {
    couponId: doc.id,
    type: coupon.type,
    expiresAt: coupon.expiresAt,
  };
}
