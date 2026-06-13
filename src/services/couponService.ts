import { collection, getDocs, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp, getFirebaseDb } from '../lib/firebase';
import type { CouponType, PurchasedGiftCoupon, UserCouponSummary } from '../types/coupon';

function getFunctionsInstance() {
  return getFunctions(getFirebaseApp(), 'europe-west1');
}

export async function redeemCouponCode(code: string): Promise<{
  couponId: string;
  type: CouponType;
  expiresAt: string;
}> {
  const fn = httpsCallable<{ code: string }, {
    couponId: string;
    type: CouponType;
    expiresAt: string;
  }>(getFunctionsInstance(), 'redeemCoupon');
  const result = await fn({ code });
  return result.data;
}

export async function loadUserCoupons(uid: string): Promise<UserCouponSummary[]> {
  const snap = await getDocs(
    query(collection(getFirebaseDb(), 'coupons'), where('redeemedByUid', '==', uid)),
  );

  return snap.docs
    .map((docSnap) => {
      const data = docSnap.data();
      return {
        couponId: docSnap.id,
        type: data.type as CouponType,
        status: data.status as UserCouponSummary['status'],
        expiresAt: String(data.expiresAt ?? ''),
        percentOff: typeof data.percentOff === 'number' ? data.percentOff : undefined,
      };
    })
    .filter((coupon) => coupon.status === 'redeemed')
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
}

export async function loadPurchasedGiftCoupons(uid: string): Promise<PurchasedGiftCoupon[]> {
  const snap = await getDocs(
    query(collection(getFirebaseDb(), 'coupons'), where('purchasedByUid', '==', uid)),
  );

  return snap.docs
    .map((docSnap) => {
      const data = docSnap.data();
      return {
        couponId: docSnap.id,
        status: data.status as PurchasedGiftCoupon['status'],
        expiresAt: String(data.expiresAt ?? ''),
        shareCode: String(data.shareCode ?? ''),
        codeHint: String(data.codeHint ?? ''),
      };
    })
    .filter((coupon) => coupon.shareCode)
    .sort((a, b) => b.expiresAt.localeCompare(a.expiresAt));
}

export async function checkGraceNoSlotsCoupon(): Promise<{ issued: boolean; couponId?: string }> {
  const fn = httpsCallable<Record<string, never>, { issued: boolean; couponId?: string }>(
    getFunctionsInstance(),
    'checkGraceNoSlotsCoupon',
  );
  const result = await fn({});
  return result.data;
}
