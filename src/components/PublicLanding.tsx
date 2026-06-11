import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Heart,
  Layers,
  Mail,
  MessageCircle,
  Sparkles,
  User,
} from 'lucide-react';
import { BookingPreview } from './BookingPreview';
import type { LanguageType } from './Header';
import { PRIVACY_POLICY_URL } from '../constants/links';
import { formatEmailCallableError, subscribeNewsletter } from '../services/emailService';

interface PublicLandingProps {
  language: LanguageType;
  onRegister: () => void;
  onExploreStudy: () => void;
}

export function PublicLanding({ language, onRegister, onExploreStudy }: PublicLandingProps) {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [newsletterError, setNewsletterError] = useState('');

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterStatus('loading');
    setNewsletterError('');
    try {
      await subscribeNewsletter({ email: newsletterEmail.trim(), language });
      setNewsletterStatus('success');
      setNewsletterEmail('');
    } catch (err) {
      setNewsletterStatus('error');
      setNewsletterError(formatEmailCallableError(err, language));
    }
  };

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

      <section className="marketing-section glass-panel">
        <div className="marketing-section-icon">
          <Mail size={24} />
        </div>
        <h2>{language === 'en' ? 'Luna newsletter' : 'Newsletter Luna'}</h2>
        <p>
          {language === 'en'
            ? 'Japanese tips, culture, and updates — no spam. Welcome series included.'
            : 'Consigli di giapponese, cultura e novità — niente spam. Serie di benvenuto inclusa.'}
        </p>
        <form onSubmit={(e) => void handleNewsletter(e)} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <input
            type="email"
            required
            value={newsletterEmail}
            onChange={(e) => setNewsletterEmail(e.target.value)}
            placeholder={language === 'en' ? 'your@email.com' : 'tua@email.it'}
            style={{
              flex: '1 1 220px',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--bg-input)',
            }}
          />
          <button type="submit" className="btn btn-primary" disabled={newsletterStatus === 'loading'}>
            {newsletterStatus === 'loading'
              ? (language === 'en' ? 'Subscribing…' : 'Iscrizione…')
              : (language === 'en' ? 'Subscribe' : 'Iscriviti')}
          </button>
        </form>
        {newsletterStatus === 'success' && (
          <p style={{ color: 'var(--success)', marginTop: '0.75rem', fontSize: '0.9rem' }}>
            {language === 'en' ? 'Thanks! Check your inbox for the welcome email.' : 'Grazie! Controlla la posta per il benvenuto.'}
          </p>
        )}
        {newsletterStatus === 'error' && (
          <p style={{ color: 'var(--error)', marginTop: '0.75rem', fontSize: '0.9rem' }}>{newsletterError}</p>
        )}
        <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {language === 'en'
            ? 'By subscribing you agree to receive marketing emails. '
            : 'Iscrivendoti accetti di ricevere email di marketing. '}
          <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer">
            {language === 'en' ? 'Privacy policy' : 'Informativa privacy'}
          </a>
        </p>
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
