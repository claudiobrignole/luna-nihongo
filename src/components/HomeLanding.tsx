import { ArrowRight } from 'lucide-react';
import { CURRICULUM_LEVELS, SYLLABUS } from '../data/curriculum';
import type { LunaUser } from '../types/user';
import type { TabType, LanguageType } from './Header';
import { BlogTeaserSection } from './BlogTeaserSection';
import { LandingBands } from './LandingBands';
import lunaWave from '../assets/brand/luna-wave.webp';

interface HomeLandingProps {
  language: LanguageType;
  currentUser: LunaUser;
  onNavigate: (tab: TabType, blogSlug?: string | null) => void;
  onOpenOnboarding?: () => void;
}

export function HomeLanding({ language, currentUser, onNavigate, onOpenOnboarding }: HomeLandingProps) {
  const en = language === 'en';
  const completed = currentUser.completedUnits.length;
  const total = SYLLABUS.length;
  const level = CURRICULUM_LEVELS.find((l) => l.level === currentUser.preferredStartLevel) ?? CURRICULUM_LEVELS[0];

  return (
    <div className="mg-landing page-view">
      <section className="mg-band mg-band--red mg-bleed mg-hero">
        <div className="mg-ribbon" aria-hidden="true"><span lang="ja">おかえり</span></div>
        <div className="mg-band-inner">
          <span className="mg-watermark" aria-hidden="true" lang="ja">月</span>
          <div className="mg-fig" style={{ shapeOutside: `url("${lunaWave}")` }}>
            <div className="mg-fig-media mg-zoom-media">
              <img src={lunaWave} alt={en ? 'Luna waves hello, manga style' : 'Luna saluta, in stile manga'} />
            </div>
          </div>
          <div className="mg-band-copy">
            <h1 className="mg-hero-title" lang="ja">
              おかえりなさい、<br />{currentUser.username}さん。
            </h1>
            <div className="mg-card">
              <p className="mg-hero-lead">
                {en
                  ? 'Pick up where you left off — your path, your decks and Luna-sensei are ready.'
                  : 'Riprendi da dove eri rimasto — il tuo percorso, i deck e Luna-sensei ti aspettano.'}
              </p>
              <div className="mg-stats">
                <div>
                  <strong>{completed}</strong>
                  <span>{en ? 'units done' : 'unità fatte'}</span>
                </div>
                <div>
                  <strong>{total}</strong>
                  <span>{en ? 'in the path' : 'nel percorso'}</span>
                </div>
                <div>
                  <strong>{level.title[language]}</strong>
                  <span>{en ? 'your focus' : 'il tuo focus'}</span>
                </div>
              </div>
              <div className="mg-hero-cta">
                <button type="button" className="mg-btn mg-btn--red" onClick={() => onNavigate('path')}>
                  {en ? 'Continue studying' : 'Continua a studiare'}
                  <ArrowRight size={16} />
                </button>
                {onOpenOnboarding && (
                  <button type="button" className="mg-btn" onClick={onOpenOnboarding}>
                    {en ? 'Change level' : 'Cambia livello'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingBands
        language={language}
        variant="logged"
        completedUnits={completed}
        onStudy={() => onNavigate('path')}
        onFlashcards={() => onNavigate('flashcards')}
        onTalk={() => onNavigate('tutor')}
        onAnime={() => onNavigate('tutor')}
        onLessons={() => onNavigate('teacher')}
      />

      <BlogTeaserSection
        language={language}
        onOpenBlog={() => onNavigate('blog')}
        onOpenPost={(slug) => onNavigate('blog', slug)}
      />
    </div>
  );
}
