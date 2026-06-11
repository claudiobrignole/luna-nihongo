import { ArrowRight, BookOpen, GraduationCap, MessageCircle, Sparkles, User } from 'lucide-react';
import { CURRICULUM_LEVELS, CURRICULUM_META, SYLLABUS } from '../data/curriculum';
import type { LunaUser } from '../types/user';
import type { TabType, LanguageType } from './Header';

interface HomeLandingProps {
  language: LanguageType;
  currentUser: LunaUser;
  onNavigate: (tab: TabType) => void;
  onOpenOnboarding?: () => void;
}

export function HomeLanding({ language, currentUser, onNavigate, onOpenOnboarding }: HomeLandingProps) {
  const completed = currentUser.completedUnits.length;
  const total = SYLLABUS.length;
  const level = CURRICULUM_LEVELS.find((l) => l.level === currentUser.preferredStartLevel)
    ?? CURRICULUM_LEVELS[0];

  const cards = [
    {
      icon: GraduationCap,
      title: language === 'en' ? 'Guided path' : 'Percorso guidato',
      desc:
        language === 'en'
          ? `${CURRICULUM_META.unitCount} units from hiragana through N5 and N4 — choose your level and study at your pace.`
          : `${CURRICULUM_META.unitCount} unità da hiragana fino a N5 e N4 — scegli il livello e studia al tuo ritmo.`,
      action: () => onNavigate('path'),
      cta: language === 'en' ? 'Open Studio' : 'Apri Studio',
      color: 'var(--primary)',
    },
    {
      icon: User,
      title: language === 'en' ? 'Meet Luna' : 'Conosci Luna',
      desc:
        language === 'en'
          ? 'Your teacher for live lessons and the story behind the method.'
          : 'La tua insegnante per le lezioni live e il metodo del corso.',
      action: () => onNavigate('teacher'),
      cta: language === 'en' ? 'About Luna' : 'Scopri Luna',
      color: 'var(--secondary)',
    },
    {
      icon: MessageCircle,
      title: language === 'en' ? 'AI Tutor' : 'Tutor AI',
      desc:
        language === 'en'
          ? 'Chat and voice with Luna-sensei — text + natural Japanese speech.'
          : 'Chat e voce con Luna-sensei — testo e pronuncia naturale.',
      action: () => onNavigate('tutor'),
      cta: language === 'en' ? 'Start tutor' : 'Avvia tutor',
      color: 'var(--accent)',
    },
  ];

  return (
    <div className="home-landing page-view">
      <section className="home-hero glass-panel">
        <div className="home-hero-badge">
          <Sparkles size={16} />
          {language === 'en' ? 'Welcome back' : 'Bentornato'}, {currentUser.username}
        </div>
        <h1>
          {language === 'en' ? 'Your Japanese journey starts here' : 'Il tuo viaggio in giapponese inizia qui'}
        </h1>
        <p>
          {language === 'en'
            ? 'Luna Nihongo combines a structured N5 path, spaced repetition, and an AI tutor who speaks with you — like a real lesson.'
            : 'Luna Nihongo unisce un percorso N5 strutturato, ripasso spaziato e un tutor AI che parla con te — come una lezione vera.'}
        </p>
        <div className="home-hero-stats">
          <div>
            <strong>{completed}</strong>
            <span>{language === 'en' ? 'units done' : 'unità completate'}</span>
          </div>
          <div>
            <strong>{total}</strong>
            <span>{language === 'en' ? 'in the path' : 'nel percorso'}</span>
          </div>
          <div>
            <strong>{level.title[language]}</strong>
            <span>{language === 'en' ? 'your focus' : 'il tuo focus'}</span>
          </div>
        </div>
        <div className="home-hero-cta">
          <button type="button" className="btn btn-primary" onClick={() => onNavigate('path')}>
            <BookOpen size={18} />
            {language === 'en' ? 'Continue studying' : 'Continua a studiare'}
            <ArrowRight size={18} />
          </button>
          {onOpenOnboarding && (
            <button type="button" className="btn btn-secondary" onClick={onOpenOnboarding}>
              {language === 'en' ? 'Change study level' : 'Cambia livello di studio'}
            </button>
          )}
        </div>
      </section>

      <div className="home-cards">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="home-card glass-panel">
              <div className="home-card-icon" style={{ color: card.color }}>
                <Icon size={22} />
              </div>
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
              <button type="button" className="btn btn-secondary home-card-btn" onClick={card.action}>
                {card.cta}
                <ArrowRight size={16} />
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
