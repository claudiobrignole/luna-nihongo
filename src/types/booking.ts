export interface BookedLesson {
  id: string;
  name: string;
  email: string;
  level: string;
  notes?: string;
  date: string;
  time: string;
  plan: 'single' | 'subscription';
  meetLink: string;
  price: string;
  timestamp: string;
}

export type NewBooking = Omit<BookedLesson, 'id' | 'timestamp'>;
