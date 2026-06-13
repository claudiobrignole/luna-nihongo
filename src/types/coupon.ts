export type CouponType = 'free_lesson' | 'percent_off_extra';
export type CouponStatus = 'issued' | 'redeemed' | 'used' | 'expired' | 'revoked';

export interface UserCouponSummary {
  couponId: string;
  type: CouponType;
  status: CouponStatus;
  expiresAt: string;
  percentOff?: number;
}

export interface PurchasedGiftCoupon {
  couponId: string;
  status: CouponStatus;
  expiresAt: string;
  shareCode: string;
  codeHint: string;
}
