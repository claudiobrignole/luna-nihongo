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
  teacherId: string;
  teacherDisplayName: string;
  teacherEmail: string;
  meetLink: string | null;
  price: string;
  timestamp: string;
  slotStartAt?: string | null;
  couponId?: string | null;
  studentUid?: string;
}

export interface TeacherBookingMailData {
  teacherName: string;
  studentName: string;
  studentEmail: string;
  date: string;
  time: string;
  plan?: string;
  meetLink?: string | null;
  dashboardUrl?: string;
}
