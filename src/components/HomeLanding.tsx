import { ArrowRight } from 'lucide-react';
import { CURRICULUM_LEVELS, CURRICULUM_META, SYLLABUS } from '../data/curriculum';
import type { LunaUser } from '../types/user';
import type { TabType, LanguageType } from './Header';
import lunaWave from '../assets/brand/luna-wave.webp';
import lunaStudy from '../assets/brand/luna-study.webp';
import lunaFlash from '../assets/brand/luna-flash.webp';
import lunaTalk from '../assets/brand/luna-talk.webp';
import lunaTorii from '../assets/brand/luna-torii.webp';

interface HomeLandingProps {
  language: LanguageType;
  currentUser: LunaUser;
  onNavigate: (tab: TabType) => void;
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
          <div className="mg-fig">
            <img src={lunaWave} alt={en ? 'Luna waves hello, manga style' : 'Luna saluta, in stile manga'} />
          </div>
        </div>
      </section>

      <section className="mg-band mg-band--washi mg-bleed">
        <div className="mg-band-inner">
          <span className="mg-watermark" aria-hidden="true">S</span>
          <span className="mg-vertical" aria-hidden="true" lang="ja">つづける</span>
          <div className="mg-band-copy">
            <p className="mg-index" style={{ color: 'var(--ln-red-deep)' }}>01.STUDY</p>
            <h2 className="mg-band-title" lang="ja">まなぶ — ガイドつきの道</h2>
            <p className="mg-band-sub">
              {en
                ? `You’ve completed ${completed} of ${CURRICULUM_META.unitCount} units. Continue the guided path at your level.`
                : `Hai completato ${completed} unità su ${CURRICULUM_META.unitCount}. Prosegui il percorso guidato al tuo livello.`}
            </p>
            <button type="button" className="mg-btn mg-btn--red" onClick={() => onNavigate('path')}>
              {en ? 'Open the path' : 'Apri il percorso'}
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="mg-fig">
            <img src={lunaStudy} alt="" aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className="mg-band mg-band--yellow mg-bleed">
        <div className="mg-band-inner">
          <span className="mg-watermark" aria-hidden="true">F</span>
          <span className="mg-vertical" aria-hidden="true" lang="ja">おさらい</span>
          <div className="mg-band-copy">
            <p className="mg-index" style={{ color: 'var(--ln-red-deep)' }}>02.FLASHCARDS</p>
            <h2 className="mg-band-title" lang="ja">くりかえす — SRSデッキ</h2>
            <p className="mg-band-sub">
              {en
                ? 'Review your deck with spaced repetition — filter by level or type and lock in what matters.'
                : 'Ripassa il tuo deck con la ripetizione spaziata — filtra per livello o tipo e fissa ciò che conta.'}
            </p>
            <button type="button" className="mg-btn mg-btn--ink" onClick={() => onNavigate('flashcards')}>
              {en ? 'Review now' : 'Ripassa ora'}
            </button>
          </div>
          <div className="mg-fig" style={{ right: '8%' }}>
            <img src={lunaFlash} alt="" aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className="mg-band mg-band--purple mg-bleed">
        <div className="mg-band-inner">
          <span className="mg-watermark" aria-hidden="true">T</span>
          <span className="mg-vertical" aria-hidden="true" lang="ja">はなそう</span>
          <div className="mg-band-copy">
            <p className="mg-index" style={{ color: 'var(--ln-yellow)' }}>03.TALK</p>
            <h2 className="mg-band-title" lang="ja">はなす — るな先生といつでも</h2>
            <p className="mg-band-sub">
              {en
                ? 'Chat in text or voice with Luna-sensei — ask anything and practice real conversation.'
                : 'Chatta a testo o voce con Luna-sensei — chiedi qualsiasi cosa e allenati nella conversazione.'}
            </p>
            <button type="button" className="mg-btn mg-btn--yellow" onClick={() => onNavigate('tutor')}>
              {en ? 'Open the tutor' : 'Apri il tutor'}
            </button>
          </div>
          <div className="mg-fig">
            <img src={lunaTalk} alt="" aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className="mg-band mg-band--ink mg-bleed">
        <div className="mg-band-inner">
          <span className="mg-watermark" aria-hidden="true" lang="ja">月</span>
          <span className="mg-vertical" aria-hidden="true" lang="ja">せんせい</span>
          <div className="mg-band-copy">
            <p className="mg-index" style={{ color: 'var(--ln-yellow)' }}>04.LESSONS</p>
            <h2 className="mg-band-title" lang="ja">るな先生と、ライブで</h2>
            <p className="mg-band-sub" style={{ color: 'var(--ln-washi)' }}>
              {en
                ? 'Meet Luna and book a one-on-one online lesson — native speaker, fluent in Italian and English.'
                : 'Conosci Luna e prenota una lezione individuale online — madrelingua, parla italiano e inglese.'}
            </p>
            <button
              type="button"
              className="mg-btn mg-btn--red"
              onClick={() => onNavigate('teacher')}
              style={{ borderColor: 'var(--ln-paper)' }}
            >
              {en ? 'About Luna & booking' : 'Scopri Luna e prenota'}
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="mg-fig">
            <img src={lunaTorii} alt="" aria-hidden="true" />
          </div>
        </div>
      </section>
    </div>
  );
}
