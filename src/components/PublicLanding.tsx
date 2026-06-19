import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { BookingPreview } from './BookingPreview';
import { BlogTeaserSection } from './BlogTeaserSection';
import { LandingBands } from './LandingBands';
import type { LanguageType, TabType } from './Header';
import { PRIVACY_POLICY_URL } from '../constants/links';
import { formatEmailCallableError, subscribeNewsletter } from '../services/emailService';
import lunaWave from '../assets/brand/luna-wave.webp';
import sakura from '../assets/brand/sakura.svg';

interface PublicLandingProps {
  language: LanguageType;
  onRegister: () => void;
  onExploreStudy: () => void;
  onNavigate: (tab: TabType, blogSlug?: string | null) => void;
}

export function PublicLanding({ language, onRegister, onExploreStudy, onNavigate }: PublicLandingProps) {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [newsletterError, setNewsletterError] = useState('');
  const en = language === 'en';

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

  const scrollToBooking = () => {
    document.getElementById('mg-booking')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="mg-landing page-view">
      <section className="mg-band mg-band--red mg-bleed mg-hero">
        <div className="mg-ribbon" aria-hidden="true"><span lang="ja">ようこそ</span></div>
        <div className="mg-band-inner">
          <span className="mg-watermark" aria-hidden="true" lang="ja">な</span>
          <div className="mg-band-copy">
            <h1 className="mg-hero-title" lang="ja">
              ゼロから N4 まで、<br />るなと学ぶ日本語。
            </h1>
            <div className="mg-card">
              <p className="mg-hero-lead">
                {en
                  ? 'Luna Nihongo is the guided path from hiragana to JLPT N4: structured units, SRS flashcards, an AI tutor that speaks with you, and live lessons with Luna — in Italian and English.'
                  : 'Luna Nihongo è il percorso guidato dall\'hiragana al JLPT N4: unità strutturate, flashcard SRS, un tutor AI che parla con te e lezioni live con Luna — in italiano e inglese.'}
              </p>
              <div className="mg-hero-cta">
                <button type="button" className="mg-btn mg-btn--red" onClick={onRegister}>
                  {en ? 'Sign up free' : 'Registrati gratuitamente'}
                  <ArrowRight size={16} />
                </button>
                <button type="button" className="mg-btn" onClick={onExploreStudy}>
                  {en ? 'Explore the path' : 'Esplora il percorso'}
                </button>
              </div>
              <p className="mg-hero-free" style={{ color: 'var(--ln-ink)' }}>
                <span className="mg-badge mg-badge--free" style={{ marginRight: '0.5rem' }} lang="ja">
                  {en ? '無料 · FREE' : '無料 · GRATIS'}
                </span>
                {en
                  ? 'Study path & flashcards are free.'
                  : 'Percorso Studio e flashcard gratuiti.'}
              </p>
            </div>
          </div>
          <div className="mg-fig">
            <div className="mg-fig-media mg-zoom-media">
              <img
                src={lunaWave}
                alt={en ? 'Luna waves hello among falling cherry blossoms, manga style' : 'Luna saluta tra i petali di ciliegio, in stile manga'}
              />
            </div>
          </div>
        </div>
      </section>

      <LandingBands
        language={language}
        variant="public"
        onStudy={onExploreStudy}
        onFlashcards={onRegister}
        onTalk={onRegister}
        onAnime={onRegister}
        onLessons={scrollToBooking}
      />

      <BlogTeaserSection
        language={language}
        onOpenBlog={() => onNavigate('blog')}
        onOpenPost={(slug) => onNavigate('blog', slug)}
      />

      <section className="mg-section" id="mg-booking">
        <BookingPreview language={language} onRegister={onRegister} />
      </section>

      <section className="mg-section">
        <div className="mg-card mg-newsletter-card">
          <img src={sakura} className="mg-newsletter-sakura" alt="" aria-hidden="true" />
          <h2>
            <span lang="ja">るな</span>{en ? ' newsletter' : ' — la newsletter'}
          </h2>
          <p className="mg-band-sub" style={{ marginTop: '0.5rem' }}>
            {en
              ? 'Japanese tips, culture, and updates — no spam. Welcome series included.'
              : 'Consigli di giapponese, cultura e novità — niente spam. Serie di benvenuto inclusa.'}
          </p>
          <form onSubmit={(e) => void handleNewsletter(e)} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
            <input
              type="email"
              required
              className="mg-input"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder={en ? 'your@email.com' : 'tua@email.it'}
            />
            <button type="submit" className="mg-btn mg-btn--red" style={{ marginTop: 0 }} disabled={newsletterStatus === 'loading'}>
              {newsletterStatus === 'loading'
                ? (en ? 'Subscribing…' : 'Iscrizione…')
                : (en ? 'Subscribe' : 'Iscriviti')}
            </button>
          </form>
          {newsletterStatus === 'success' && (
            <p className="mg-status-ok">
              {en ? 'Thanks! Check your inbox for the welcome email.' : 'Grazie! Controlla la posta per il benvenuto.'}
            </p>
          )}
          {newsletterStatus === 'error' && <p className="mg-status-err">{newsletterError}</p>}
          <p className="mg-note">
            {en
              ? 'By subscribing you agree to receive marketing emails. '
              : 'Iscrivendoti accetti di ricevere email di marketing. '}
            <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer">
              {en ? 'Privacy policy' : 'Informativa privacy'}
            </a>
          </p>
        </div>
      </section>

      <section className="mg-band mg-band--red mg-bleed mg-cta-final">
        <div className="mg-band-inner">
          <span className="mg-watermark" aria-hidden="true" lang="ja">月</span>
          <h2 className="mg-band-title" lang="ja">いっしょに、はじめよう。</h2>
          <p className="mg-band-sub" style={{ maxWidth: '34rem' }}>
            {en
              ? 'Browse every section freely. When you open a lesson or chat with the tutor, we will ask you to register — it takes a minute.'
              : 'Esplora tutte le sezioni liberamente. Quando apri una lezione o chatti con il tutor, ti chiederemo di registrarti — un minuto.'}
          </p>
          <button type="button" className="mg-btn" onClick={onRegister}>
            {en ? 'Sign up free' : 'Registrati gratuitamente'}
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
