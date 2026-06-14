export type BookingPlan =
  | 'trial_intro'
  | 'included'
  | 'extra'
  | 'extra_rebook'
  | 'coupon'
  | 'replacement';

export interface BookedLesson {
  id: string;
  name: string;
  email: string;
  level: string;
  notes?: string;
  date: string;
  time: string;
  plan: BookingPlan;
  slotId?: string;
  slotType?: 'intro' | 'regular';
  teacherId?: string;
  teacherDisplayName?: string;
  teacherEmail?: string;
  meetLink?: string | null;
  meetLinkSetAt?: string | null;
  price: string;
  timestamp: string;
  slotStartAt?: string | null;
  couponId?: string | null;
  remindersSent?: {
    thirtySixHours?: string;
    oneHour?: string;
    teacherAddLink?: string;
  };
}

export type NewBooking = Omit<BookedLesson, 'id' | 'timestamp'>;

export function bookingPlanLabel(plan: BookingPlan, language: 'en' | 'it'): string {
  const labels: Record<BookingPlan, { en: string; it: string }> = {
    trial_intro: { en: 'Free trial intro call', it: 'Videocall introduttiva prova' },
    included: { en: 'Included monthly lesson', it: 'Lezione inclusa nel mese' },
    extra: { en: 'Extra lesson (49 EUR/CHF)', it: 'Lezione extra (49 EUR/CHF)' },
    extra_rebook: { en: 'Extra lesson (rebook)', it: 'Lezione extra (riprenotazione)' },
    coupon: { en: 'Coupon lesson', it: 'Lezione con coupon' },
    replacement: { en: 'Replacement lesson', it: 'Lezione sostitutiva' },
  };
  return labels[plan][language];
}

export function isExtraLikePlan(plan: BookingPlan): boolean {
  return plan === 'extra' || plan === 'extra_rebook';
}

export function hasMeetLink(booking: Pick<BookedLesson, 'meetLink'>): boolean {
  const link = booking.meetLink?.trim();
  return Boolean(link);
}
