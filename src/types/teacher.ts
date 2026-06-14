import type { LunaUser } from './user';

export const TEACHER_LESSON_PAYOUT_EUR = 33;

export type TeacherPayoutStatus = 'pending_invoice' | 'paid';

export interface TeacherPayoutMonth {
  id: string;
  status: TeacherPayoutStatus;
  lessonCount: number;
  amountEur: number;
  updatedAt: string;
  updatedBy: string;
  paidAt?: string | null;
}

export interface TeacherBookingView {
  id: string;
  studentUid: string;
  name: string;
  email: string;
  level: string;
  notes?: string;
  date: string;
  time: string;
  plan: string;
  slotId?: string;
  slotType?: 'intro' | 'regular';
  meetLink?: string | null;
  meetLinkSetAt?: string | null;
  price: string;
  timestamp: string;
  slotStartAt?: string | null;
  teacherId: string;
  teacherDisplayName: string;
  teacherEmail: string;
}

export function getTeacherPublicName(user: Pick<LunaUser, 'username' | 'teacherDisplayName'>): string {
  const nick = user.teacherDisplayName?.trim();
  return nick && nick.length > 0 ? nick : user.username;
}

export interface BookableTeacher {
  id: string;
  username: string;
  teacherDisplayName?: string;
}

export function monthKeyFromDate(isoOrDate: string): string {
  return isoOrDate.slice(0, 7);
}
