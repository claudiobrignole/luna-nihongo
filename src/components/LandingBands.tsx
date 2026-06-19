import { ArrowRight } from 'lucide-react';
import { LANDING_SECTIONS, studyLeadLogged } from '../content/landingSections';
import type { LanguageType } from './Header';
import { LandingFeatureBand } from './LandingFeatureBand';

interface LandingBandsProps {
  language: LanguageType;
  variant: 'public' | 'logged';
  completedUnits?: number;
  onStudy: () => void;
  onFlashcards: () => void;
  onTalk: () => void;
  onAnime: () => void;
  onLessons: () => void;
}

export function LandingBands({
  language,
  variant,
  completedUnits = 0,
  onStudy,
  onFlashcards,
  onTalk,
  onAnime,
  onLessons,
}: LandingBandsProps) {
  const verticalLogged: Record<string, string> = {
    study: 'つづける',
    flashcards: 'おさらい',
    talk: 'はなそう',
    anime: 'あにめ',
    lessons: 'せんせい',
  };

  const ctaFor = (id: string) => {
    const map: Record<string, { label: { it: string; en: string }; action: () => void; btn: string }> = {
      study: {
        label: { it: 'Apri il percorso', en: 'Open the path' },
        action: onStudy,
        btn: 'mg-btn--red',
      },
      flashcards: {
        label: { it: variant === 'public' ? 'Provale gratis' : 'Ripassa ora', en: variant === 'public' ? 'Try them free' : 'Review now' },
        action: onFlashcards,
        btn: 'mg-btn--ink',
      },
      talk: {
        label: { it: variant === 'public' ? 'Parla con るな' : 'Apri il tutor', en: variant === 'public' ? 'Talk with るな' : 'Open the tutor' },
        action: onTalk,
        btn: 'mg-btn--yellow',
      },
      anime: {
        label: {
          it: 'Parla con Luna del tuo anime preferito',
          en: 'Talk with Luna about your favourite anime',
        },
        action: onAnime,
        btn: 'mg-btn--purple',
      },
      lessons: {
        label: {
          it: variant === 'public' ? 'Prenota una lezione' : 'Scopri Luna e prenota',
          en: variant === 'public' ? 'Book a lesson' : 'About Luna & booking',
        },
        action: onLessons,
        btn: 'mg-btn--red',
      },
    };
    return map[id];
  };

  return (
    <>
      {LANDING_SECTIONS.map((section) => {
        const cta = ctaFor(section.id);
        const leadOverride =
          section.id === 'study' && variant === 'logged'
            ? studyLeadLogged(completedUnits, language)
            : undefined;
        const verticalJa =
          variant === 'logged' ? verticalLogged[section.id] : undefined;

        return (
          <LandingFeatureBand
            key={section.id}
            section={section}
            language={language}
            leadOverride={leadOverride}
            verticalJa={verticalJa}
          >
            <button
              type="button"
              className={`mg-btn ${cta.btn}`}
              onClick={cta.action}
              style={section.subInk ? { borderColor: 'var(--ln-paper)' } : undefined}
            >
              {cta.label[language]}
              {(section.id === 'study' || section.id === 'lessons') && <ArrowRight size={16} />}
            </button>
          </LandingFeatureBand>
        );
      })}
    </>
  );
}
