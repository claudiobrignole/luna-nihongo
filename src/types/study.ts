export type StudyActivityType =
  | 'unit_opened'
  | 'unit_completed'
  | 'quiz_completed'
  | 'flashcard_session'
  | 'tutor_message'
  | 'level_selected';

export interface StudyActivity {
  id: string;
  type: StudyActivityType;
  label: string;
  unitId?: string;
  level?: number;
  meta?: Record<string, string | number>;
  createdAt: string;
}
