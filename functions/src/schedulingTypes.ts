export type BookingPlan =
  | 'trial_intro'
  | 'included'
  | 'extra'
  | 'extra_rebook'
  | 'coupon'
  | 'replacement';

export interface BookingResult {
  bookingId: string;
  name: string;
  email: string;
  level: string;
  notes: string;
  date: string;
  time: string;
  plan: BookingPlan;
  slotId: string;
  slotType: 'intro' | 'regular';
  meetLink: string;
  price: string;
  timestamp: string;
  slotStartAt?: string | null;
  couponId?: string | null;
}
