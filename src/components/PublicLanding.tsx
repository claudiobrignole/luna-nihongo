import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Heart,
  Layers,
  MessageCircle,
  Sparkles,
  User,
} from 'lucide-react';
import { BookingPreview } from './BookingPreview';
import type { LanguageType } from './Header';

interface PublicLandingProps {
  language: LanguageType;
  onRegister: () => void;
  onExploreStudy: () => void;
}

export function PublicLanding({ language, onRegister, onExploreStudy }: PublicLandingProps) {
  return (
    <div className="marketing-landing page-view">
      <section className="marketing-hero glass-panel">
        <div className="marketing-hero-badge">
          <Sparkles size={16} />
          {language === 'en' ? 'JLPT N5 · Guided path' : 'JLPT N5 · Percorso guidato'}
        </div>
        <div className="logo-circle marketing-hero-logo">月</div>
        <h1>Luna Nihongo</h1>
        <p className="marketing-hero-lead">
          {language === 'en'
            ? 'Learn Japanese with warmth, structure, and a teacher who truly knows you — Luna guides you from hiragana to N5, with AI and live lessons.'
            : 'Impara il giapponese con calore, metodo e un\'insegnante che ti conosce — Luna ti accompagna da hiragana al N5, con AI e lezioni live.'}
        </p>
        <div className="marketing-hero-cta">
          <button type="button" className="btn btn-primary" onClick={onRegister}>
            {language === 'en' ? 'Sign up free' : 'Registrati gratuitamente'}
            <ArrowRight size={18} />
          </button>
          <button type="button" className="btn btn-secondary" onClick={onExploreStudy}>
            <GraduationCap size={18} />
            {language === 'en' ? 'Explore the path' : 'Esplora il percorso'}
          </button>
        </div>
        <p className="marketing-hero-free">
          {language === 'en'
            ? 'Lessons, flashcards & the full N5 path are free — registration required to save progress.'
            : 'Lezioni, flashcard e percorso N5 completi sono gratuiti — serve la registrazione per salvare i progressi.'}
        </p>
      </section>

      <section className="marketing-section glass-panel">
        <div className="marketing-section-icon">
          <User size={24} />
        </div>
        <h2>{language === 'en' ? 'Who is Luna?' : 'Chi è Luna?'}</h2>
        <p>
          {language === 'en'
            ? 'Luna is your Japanese teacher — native speaker, fluent in Italian and English. She built this platform so self-study never feels cold: mnemonics, encouragement, and live conversation when you are ready.'
            : 'Luna è la tua insegnante di giapponese — madrelingua, fluente in italiano e inglese. Ha creato questa piattaforma perché lo studio da soli non debba essere freddo: mnemonici, incoraggiamento e conversazione live quando sei pronto.'}
        </p>
        <p>
          {language === 'en'
            ? 'The spirit of Luna Nihongo: progress without pressure, clarity without boredom, and respect for your pace — every level is open from day one.'
            : 'Lo spirito di Luna Nihongo: progressi senza pressione, chiarezza senza noia, e rispetto per i tuoi tempi — ogni livello è aperto dal primo giorno.'}
        </p>
      </section>

      <section className="marketing-features">
        <article className="glass-panel marketing-feature-card">
          <BookOpen size={22} style={{ color: 'var(--primary)' }} />
          <h3>{language === 'en' ? '60 guided units' : '60 unità guidate'}</h3>
          <p>
            {language === 'en'
              ? 'Hiragana, katakana, kanji, grammar & review — with audio and quizzes. Free with registration.'
              : 'Hiragana, katakana, kanji, grammatica e ripasso — con audio e quiz. Gratuito con registrazione.'}
          </p>
        </article>
        <article className="glass-panel marketing-feature-card">
          <Layers size={22} style={{ color: 'var(--secondary)' }} />
          <h3>{language === 'en' ? 'Spaced repetition decks' : 'Deck a ripasso spaziato'}</h3>
          <p>
            {language === 'en'
              ? 'Cards unlock as you complete lessons. Review what matters, when it matters.'
              : 'Le carte si sbloccano completando le unità. Ripassa ciò che conta, quando conta.'}
          </p>
        </article>
        <article className="glass-panel marketing-feature-card">
          <MessageCircle size={22} style={{ color: 'var(--accent)' }} />
          <h3>{language === 'en' ? 'AI tutor · text & voice' : 'Tutor AI · testo e voce'}</h3>
          <p>
            {language === 'en'
              ? 'Luna-sensei answers your questions and speaks Japanese naturally — like Gemini Live for learners.'
              : 'Luna-sensei risponde alle tue domande e parla giapponese in modo naturale — come una lezione con voce AI.'}
          </p>
        </article>
        <article className="glass-panel marketing-feature-card">
          <Heart size={22} style={{ color: 'var(--primary)' }} />
          <h3>{language === 'en' ? 'Live lessons' : 'Lezioni live'}</h3>
          <p>
            {language === 'en'
              ? 'Book 1-on-1 time with Luna online. The booking flow below is a preview — more options coming.'
              : 'Prenota lezioni individuali con Luna online. Il flusso sotto è un\'anteprima — altre opzioni in arrivo.'}
          </p>
        </article>
      </section>

      <section className="marketing-booking-section">
        <BookingPreview language={language} onRegister={onRegister} />
      </section>

      <section className="marketing-cta-bottom glass-panel">
        <h2>{language === 'en' ? 'Ready to start?' : 'Pronto per iniziare?'}</h2>
        <p>
          {language === 'en'
            ? 'Browse every section freely. When you open a lesson or chat with the tutor, we will ask you to register — it takes a minute.'
            : 'Esplora tutte le sezioni liberamente. Quando apri una lezione o chatti con il tutor, ti chiederemo di registrarti — un minuto.'}
        </p>
        <button type="button" className="btn btn-primary" onClick={onRegister}>
          {language === 'en' ? 'Sign up free' : 'Registrati gratuitamente'}
          <ArrowRight size={18} />
        </button>
      </section>
    </div>
  );
}
