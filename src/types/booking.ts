export type BookingPlan = 'trial_intro' | 'included' | 'extra';

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
  meetLink: string;
  price: string;
  timestamp: string;
}

export type NewBooking = Omit<BookedLesson, 'id' | 'timestamp'>;

export function bookingPlanLabel(plan: BookingPlan, language: 'en' | 'it'): string {
  const labels: Record<BookingPlan, { en: string; it: string }> = {
    trial_intro: { en: 'Free trial intro call', it: 'Videocall introduttiva prova' },
    included: { en: 'Included monthly lesson', it: 'Lezione inclusa nel mese' },
    extra: { en: 'Extra lesson (49 EUR/CHF)', it: 'Lezione extra (49 EUR/CHF)' },
  };
  return labels[plan][language];
}
