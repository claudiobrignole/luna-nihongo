import type { TutorContextSheetId } from '../components/TutorContextToolbar';

export function tutorSheetTitle(id: TutorContextSheetId, language: 'en' | 'it'): string {
  const titles: Record<TutorContextSheetId, { en: string; it: string }> = {
    memory: { en: 'Luna remembers', it: 'Luna ricorda' },
    profile: { en: 'What you want Luna to know', it: 'Tu vuoi che sappia' },
    plan: { en: 'Your plan', it: 'Il tuo piano' },
    progress: { en: 'Your progress', it: 'I tuoi progressi' },
    history: { en: 'Live history', it: 'Storico live' },
  };
  return titles[id][language];
}
