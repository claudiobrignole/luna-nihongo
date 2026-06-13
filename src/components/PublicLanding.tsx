import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { BookingPreview } from './BookingPreview';
import type { LanguageType } from './Header';
import { CURRICULUM_META } from '../data/curriculum';
import { PRIVACY_POLICY_URL } from '../constants/links';
import { formatEmailCallableError, subscribeNewsletter } from '../services/emailService';
import lunaWave from '../assets/brand/luna-wave.webp';
import lunaStudy from '../assets/brand/luna-study.webp';
import lunaFlash from '../assets/brand/luna-flash.webp';
import lunaTalk from '../assets/brand/luna-talk.webp';
import lunaTorii from '../assets/brand/luna-torii.webp';
import sakura from '../assets/brand/sakura.svg';

interface PublicLandingProps {
  language: LanguageType;
  onRegister: () => void;
  onExploreStudy: () => void;
}

export function PublicLanding({ language, onRegister, onExploreStudy }: PublicLandingProps) {
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
                {en
                  ? 'Lessons, flashcards and the full path are free — registration saves your progress.'
                  : 'Lezioni, flashcard e percorso completo sono gratuiti — la registrazione salva i progressi.'}
              </p>
            </div>
          </div>
          <div className="mg-fig">
            <img
              src={lunaWave}
              alt={en ? 'Luna waves hello among falling cherry blossoms, manga style' : 'Luna saluta tra i petali di ciliegio, in stile manga'}
            />
          </div>
        </div>
      </section>

      <section className="mg-band mg-band--washi mg-bleed">
        <div className="mg-band-inner">
          <span className="mg-watermark" aria-hidden="true">S</span>
          <span className="mg-vertical" aria-hidden="true" lang="ja">もっと見る</span>
          <div className="mg-band-copy">
            <p className="mg-index" style={{ color: 'var(--ln-red-deep)' }}>01.STUDY</p>
            <h2 className="mg-band-title" lang="ja">まなぶ — ガイドつきの道</h2>
            <p className="mg-band-sub">
              {en
                ? `A guided path: ${CURRICULUM_META.unitCount} units from hiragana to JLPT N4 — kanji, grammar, dialogues, audio and quizzes. Free with registration.`
                : `Percorso guidato: ${CURRICULUM_META.unitCount} unità da hiragana fino al JLPT N4 — kanji, grammatica, dialoghi, audio e quiz. Gratuito con la registrazione.`}
            </p>
            <button type="button" className="mg-btn mg-btn--red" onClick={onExploreStudy}>
              {en ? 'Open the path' : 'Apri il percorso'}
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="mg-fig">
            <img
              src={lunaStudy}
              alt={en ? 'Luna studies on a tablet, manga style' : 'Luna studia su un tablet, in stile manga'}
            />
          </div>
        </div>
      </section>

      <section className="mg-band mg-band--yellow mg-bleed">
        <div className="mg-band-inner">
          <span className="mg-watermark" aria-hidden="true">F</span>
          <span className="mg-vertical" aria-hidden="true" lang="ja">もっと見る</span>
          <div className="mg-band-copy">
            <p className="mg-index" style={{ color: 'var(--ln-red-deep)' }}>02.FLASHCARDS</p>
            <h2 className="mg-band-title" lang="ja">くりかえす — SRSデッキ</h2>
            <p className="mg-band-sub">
              {en
                ? 'Spaced repetition: browse the whole deck, filter by level or type and review what you choose, whenever you want.'
                : 'Ripasso spaziato: sfoglia tutto il deck, filtra per livello o tipo e ripassa ciò che scegli tu, quando vuoi.'}
            </p>
            <button type="button" className="mg-btn mg-btn--ink" onClick={onRegister}>
              {en ? 'Try them free' : 'Provale gratis'}
            </button>
          </div>
          <div className="mg-fig" style={{ right: '8%' }}>
            <img
              src={lunaFlash}
              alt={en ? 'Luna holds up あ and 水 flashcards, manga style' : 'Luna mostra le flashcard あ e 水, in stile manga'}
            />
          </div>
        </div>
      </section>

      <section className="mg-band mg-band--purple mg-bleed">
        <div className="mg-band-inner">
          <span className="mg-watermark" aria-hidden="true">T</span>
          <span className="mg-vertical" aria-hidden="true" lang="ja">もっと見る</span>
          <div className="mg-band-copy">
            <p className="mg-index" style={{ color: 'var(--ln-yellow)' }}>03.TALK</p>
            <h2 className="mg-band-title" lang="ja">はなす — るな先生といつでも</h2>
            <p className="mg-band-sub">
              {en
                ? 'AI tutor in text and voice: Luna-sensei answers your questions and speaks natural Japanese — and Luna Live gives you real conversation practice.'
                : 'Tutor AI in testo e voce: Luna-sensei risponde alle tue domande e parla giapponese in modo naturale — e con Luna Live ti alleni nella conversazione vera.'}
            </p>
            <button type="button" className="mg-btn mg-btn--yellow" onClick={onRegister}>
              {en ? 'Talk with るな' : 'Parla con るな'}
            </button>
          </div>
          <div className="mg-fig">
            <img
              src={lunaTalk}
              alt={en ? 'Luna in a kimono opens her arms saying hello, manga style' : 'Luna in kimono apre le braccia salutando, in stile manga'}
            />
          </div>
        </div>
      </section>

      <section className="mg-band mg-band--ink mg-bleed">
        <div className="mg-band-inner">
          <span className="mg-watermark" aria-hidden="true">L</span>
          <span className="mg-vertical" aria-hidden="true" lang="ja">もっと見る</span>
          <div className="mg-band-copy">
            <p className="mg-index" style={{ color: 'var(--ln-yellow)' }}>04.LESSONS</p>
            <h2 className="mg-band-title" lang="ja">ライブレッスン</h2>
            <p className="mg-band-sub" style={{ color: 'var(--ln-washi)' }}>
              {en
                ? 'One-on-one online lessons with Luna — native speaker, fluent in Italian and English. Book from the calendar below.'
                : 'Lezioni individuali online con Luna — madrelingua, parla italiano e inglese. Prenota dal calendario qui sotto.'}
            </p>
            <button type="button" className="mg-btn mg-btn--red" onClick={scrollToBooking} style={{ borderColor: 'var(--ln-paper)' }}>
              {en ? 'Book a lesson' : 'Prenota una lezione'}
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="mg-fig">
            <img
              src={lunaTorii}
              alt={en ? 'Luna in a kimono in front of a torii gate, manga style' : 'Luna in kimono davanti a un torii, in stile manga'}
            />
          </div>
        </div>
      </section>

      <section className="mg-section" id="mg-booking">
        <BookingPreview language={language} onRegister={onRegister} />
      </section>

      <section className="mg-section">
        <div className="mg-card mg-newsletter-card">
          <img src={sakura} className="mg-newsletter-sakura" alt="" aria-hidden="true" />
          <h2 style={{ fontFamily: 'var(--ln-font-display)', fontWeight: 900, fontSize: '1.4rem' }}>
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
