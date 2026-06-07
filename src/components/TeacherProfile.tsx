import React, { useState } from 'react';
import { Award, BookOpen, Clock, Globe, ArrowRight, MessageSquare, Star, ShieldCheck } from 'lucide-react';
import type { LunaUser } from '../types/user';
import { hasActiveSubscription, isTrialActive, trialDaysRemaining, includedLessonsRemaining, MONTHLY_SUBSCRIPTION_LABEL, EXTRA_LESSON_PRICE_LABEL, AI_MINUTES_WEEKLY } from '../types/user';
import { FreeTrialButton } from './FreeTrialButton';
import { PremiumUpgradeButton } from './PremiumUpgradeButton';

interface TeacherProfileProps {
  language: 'en' | 'it';
  currentUser?: LunaUser;
  onNavigateToBooking: (mode: 'intro' | 'regular') => void;
  onTrialRefresh?: () => void | Promise<void>;
  onRequireAuth?: () => void;
}

export const TeacherProfile: React.FC<TeacherProfileProps> = ({
  language,
  currentUser,
  onNavigateToBooking,
  onTrialRefresh,
  onRequireAuth,
}) => {
  const subscribed = currentUser ? hasActiveSubscription(currentUser) : false;
  const includedLeft = currentUser ? includedLessonsRemaining(currentUser) : 0;
  const trialActive = currentUser ? isTrialActive(currentUser) : false;
  const trialDays = currentUser ? trialDaysRemaining(currentUser) : 0;
  const [activeReviewIndex, setActiveReviewIndex] = useState<number>(0);

  const testimonials = [
    {
      name: 'Matteo R.',
      location: 'Milano, Italy',
      rating: 5,
      text: {
        en: "Luna is an amazing teacher! Her lessons are fun, very structured, and my speaking improved so much in just two months. Highly recommended!",
        it: "Luna è un'insegnante fantastica! Le sue lezioni sono divertenti, molto strutturate e la mia conversazione è migliorata moltissimo in soli due mesi. Consigliatissima!"
      }
    },
    {
      name: 'Sarah M.',
      location: 'Zurich, Switzerland',
      rating: 5,
      text: {
        en: "The combination of the app's spaced repetition and 1-on-1 lessons with Luna is perfect. She explains Japanese grammar particles in a way that finally makes sense.",
        it: "La combinazione di questa app e delle lezioni individuali con Luna è perfetta. Spiega le particelle grammaticali in un modo che finalmente ha senso!"
      }
    },
    {
      name: 'Davide G.',
      location: 'Rome, Italy',
      rating: 5,
      text: {
        en: "Having a native teacher who also speaks fluent Italian and English makes a huge difference. The booking process is super simple and integrated.",
        it: "Avere un'insegnante madrelingua che parla anche italiano ed inglese fluente fa una differenza enorme. La prenotazione è semplicissima."
      }
    }
  ];

  const handleNextReview = () => {
    setActiveReviewIndex(prev => (prev + 1) % testimonials.length);
  };

  return (
    <div className="teacher-profile-view" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      
      {/* Hero Section */}
      <div 
        className="glass-panel" 
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          padding: '2.5rem',
          gap: '2.5rem',
          alignItems: 'center',
          background: 'linear-gradient(135deg, var(--bg-panel), var(--primary-glow))'
        }}
      >
        {/* Profile Circle Illustration */}
        <div style={{
          flex: '1 1 200px',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <div style={{
            position: 'relative',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 30px var(--primary-glow)',
            border: '4px solid var(--bg-app)'
          }}>
            <span className="ja-text" style={{
              fontSize: '4.5rem',
              color: 'white',
              fontWeight: '700'
            }}>
              月
            </span>
            <div style={{
              position: 'absolute',
              bottom: '5px',
              right: '5px',
              backgroundColor: 'var(--success)',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 4px 10px var(--success-glow)'
            }}>
              <ShieldCheck size={14} />
              ONLINE
            </div>
          </div>
        </div>

        {/* Luna Bio */}
        <div style={{ flex: '2 1 350px', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--primary)',
              backgroundColor: 'var(--primary-glow)',
              padding: '4px 10px',
              borderRadius: '8px',
              letterSpacing: '0.05em'
            }}>
              {language === 'en' ? 'NATIVE JAPANESE SPEAKER' : 'MADRELINGUA GIAPPONESE'}
            </span>
          </div>

          <h2 style={{ fontSize: '2.5rem', lineHeight: '1.1' }}>
            {language === 'en' ? 'Learn Japanese with Luna' : 'Impara il Giapponese con Luna'}
          </h2>

          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>
            {language === 'en'
              ? "Hi! I'm Luna. I help language enthusiasts master Japanese from absolute beginner to conversational fluency. I design custom paths focusing on practical speaking, particle clarity, and natural pronunciation, tailored for Italian and English speakers."
              : "Ciao! Sono Luna. Aiuto gli appassionati di lingue a padroneggiare il giapponese, dal livello principiante assoluto alla conversazione fluente. Creo percorsi personalizzati focalizzati sulla lingua parlata e sulla grammatica, su misura per italiani ed anglofoni."}
          </p>

          {/* Teacher Badges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.8rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <Clock size={16} style={{ color: 'var(--primary)' }} />
              <span>{language === 'en' ? 'Custom Schedule' : 'Orari Flessibili'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <Globe size={16} style={{ color: 'var(--primary)' }} />
              <span>{language === 'en' ? 'Bilingual Support' : 'Supporto Bilingue'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <Award size={16} style={{ color: 'var(--primary)' }} />
              <span>{language === 'en' ? '5+ Years Teaching' : '5+ Anni Esperienza'}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Why Choose 1-on-1 */}
      <div>
        <h3 style={{ fontSize: '1.6rem', textAlign: 'center', marginBottom: '2rem' }}>
          {language === 'en' ? 'Why study 1-on-1 with Luna?' : 'Perché studiare a tu per tu con Luna?'}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid var(--primary)' }}>
            <div style={{ color: 'var(--primary)', marginBottom: '0.8rem' }}><MessageSquare size={28} /></div>
            <h4 style={{ marginBottom: '0.5rem' }}>{language === 'en' ? 'Natural Conversation' : 'Conversazione Naturale'}</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {language === 'en'
                ? "Ditch the textbooks. Practice real-life scenarios, casual dialogues, and get immediate feedback on your pitch accent and phrasing."
                : "Dimentica i libri di testo obsoleti. Esercitati in dialoghi di vita reale, impara lo slang naturale e correggi subito l'accento."}
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid var(--accent)' }}>
            <div style={{ color: 'var(--accent)', marginBottom: '0.8rem' }}><BookOpen size={28} /></div>
            <h4 style={{ marginBottom: '0.5rem' }}>{language === 'en' ? 'Grammar Clarity' : 'Chiarezza Grammaticale'}</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {language === 'en'
                ? "Get explanations in fluent English or Italian. Learn particles (wa, ga, o, ni) and verb conjugations step-by-step without confusion."
                : "Ricevi spiegazioni chiare in italiano o inglese. Comprendi le particelle (wa, ga, o, ni) e le coniugazioni verbali senza dubbi."}
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '4px solid var(--secondary)' }}>
            <div style={{ color: 'var(--secondary)', marginBottom: '0.8rem' }}><Clock size={28} /></div>
            <h4 style={{ marginBottom: '0.5rem' }}>{language === 'en' ? 'In-app scheduling' : 'Prenotazione integrata'}</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {language === 'en'
                ? 'Book intro calls and lessons from Luna\'s in-app calendar — no external Google Calendar needed.'
                : 'Prenota call intro e lezioni dal calendario interno di Luna — senza Google Calendar esterno.'}
            </p>
          </div>

        </div>
      </div>

      {/* Pricing Cards */}
      <div>
        <h3 style={{ fontSize: '1.6rem', textAlign: 'center', marginBottom: '2rem' }}>
          {language === 'en' ? 'Lesson Plans & Investment' : 'Piani di Studio e Tariffe'}
        </h3>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '2rem',
          maxWidth: '850px',
          margin: '0 auto'
        }}>
          
          {/* Plan 1: Free trial */}
          <div 
            className="glass-panel"
            style={{
              flex: '1 1 280px',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '1rem',
              border: '2px solid var(--accent)',
              position: 'relative'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-15px',
              backgroundColor: 'var(--accent)',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}>
              {language === 'en' ? 'NEW' : 'NOVITÀ'}
            </div>

            <h4 style={{ fontSize: '1.2rem', color: 'var(--accent)', fontWeight: 700 }}>
              {language === 'en' ? '7 days free' : '7 giorni gratuiti'}
            </h4>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {language === 'en' ? '7 days' : '7 giorni'}
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', minHeight: '60px' }}>
              {language === 'en'
                ? 'AI tutor and Luna Live (2 h/week rolling), plus one 30-minute intro group videocall with Luna (up to 5 participants). One trial per account.'
                : 'Tutor AI e Luna Live (2 h/settimana rolling), più una videocall introduttiva di gruppo da 30 minuti con Luna (fino a 5 partecipanti). Una prova per account.'}
            </p>
            <div style={{
              width: '100%',
              borderTop: '1px solid var(--border)',
              paddingTop: '1rem',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              fontSize: '0.85rem'
            }}>
              <div>✔️ {language === 'en' ? `AI tutor + Luna Live (${AI_MINUTES_WEEKLY / 60} h/week)` : `Tutor AI + Luna Live (${AI_MINUTES_WEEKLY / 60} h/settimana)`}</div>
              <div>✔️ {language === 'en' ? '30-min intro videocall' : 'Videocall introduttiva 30 min'}</div>
              <div>✔️ {language === 'en' ? 'Lessons & flashcards stay free after trial' : 'Lezioni e flashcard restano free dopo la prova'}</div>
            </div>
            {trialActive && (
              <p style={{ fontSize: '0.8rem', color: 'var(--primary)', margin: 0 }}>
                {language === 'en'
                  ? `${trialDays} day(s) left in your trial`
                  : `${trialDays} giorno/i rimasti di prova`}
              </p>
            )}
            {currentUser ? (
              <FreeTrialButton
                language={language}
                trialUsed={currentUser.trialUsed}
                hasPremium={subscribed}
                onTrialStarted={() => onTrialRefresh?.()}
                onBookIntro={() => onNavigateToBooking('intro')}
                className="btn btn-accent"
                style={{ width: '100%', marginTop: 'auto' }}
              />
            ) : (
              <button type="button" className="btn btn-accent" style={{ width: '100%', marginTop: 'auto' }} onClick={onRequireAuth}>
                {language === 'en' ? 'Register for free trial' : 'Registrati per la prova'}
              </button>
            )}
          </div>

          {/* Plan 2: Monthly lesson package */}
          <div 
            className="glass-panel"
            style={{
              flex: '1 1 280px',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '1rem',
              border: '2px solid var(--primary)',
              position: 'relative'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-15px',
              backgroundColor: 'var(--primary)',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.05em'
            }}>
              {language === 'en' ? 'BEST VALUE (15% OFF)' : 'CONSIGLIATO (15% SCONTO)'}
            </div>

            <h4 style={{ fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 700 }}>
              {language === 'en' ? 'Monthly Sub' : 'Abbonamento Mensile'}
            </h4>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)' }}>{MONTHLY_SUBSCRIPTION_LABEL}</span>
              <span style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>/ mo</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', minHeight: '60px' }}>
              {language === 'en'
                ? 'AI tutor (2 h/week), Luna memory, 2 individual 60-min lessons per billing cycle. Unused lessons expire at cycle end. Extra lessons available.'
                : 'Tutor AI (2 h/settimana), memoria Luna, 2 lezioni individuali da 60 min per ciclo di fatturazione. Le lezioni non usate scadono a fine ciclo. Lezioni extra disponibili.'}
            </p>
            <div style={{
              width: '100%',
              borderTop: '1px solid var(--border)',
              paddingTop: '1rem',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              fontSize: '0.85rem'
            }}>
              <div>✔️ {language === 'en' ? '2 × 60-min 1-on-1 lessons / cycle' : '2 lezioni individuali da 60 min / ciclo'}</div>
              <div>✔️ {language === 'en' ? `AI tutor + Luna Live (${AI_MINUTES_WEEKLY / 60} h/week)` : `Tutor AI + Luna Live (${AI_MINUTES_WEEKLY / 60} h/settimana)`}</div>
              <div>✔️ {language === 'en' ? `Extra lessons ${EXTRA_LESSON_PRICE_LABEL}/h` : `Lezioni extra ${EXTRA_LESSON_PRICE_LABEL}/h`}</div>
              <div>✔️ {language === 'en' ? 'Unused included lessons do not roll over' : 'Le ore non usate non sono recuperabili il mese successivo'}</div>
            </div>
            {subscribed ? (
              <button
                type="button"
                onClick={() => onNavigateToBooking('regular')}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 'auto' }}
              >
                {language === 'en'
                  ? `Book lessons (${includedLeft} included left)`
                  : `Prenota lezioni (${includedLeft} incluse rimaste)`}
              </button>
            ) : (
              <PremiumUpgradeButton
                language={language}
                label={language === 'en' ? 'Subscribe with Stripe' : 'Abbonati con Stripe'}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 'auto' }}
              />
            )}
          </div>

        </div>
      </div>

      {/* Testimonials Carousel */}
      <div 
        className="glass-panel" 
        style={{
          padding: '2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', gap: '4px', color: 'var(--accent)' }}>
          {[...Array(5)].map((_, i) => <Star key={i} size={18} fill="currentColor" />)}
        </div>

        <p style={{
          fontSize: '1.1rem',
          fontStyle: 'italic',
          color: 'var(--text-main)',
          maxWidth: '80%',
          lineHeight: '1.4',
          minHeight: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          "{testimonials[activeReviewIndex].text[language]}"
        </p>

        <div>
          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
            {testimonials[activeReviewIndex].name}
          </span>
          <span style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
            ({testimonials[activeReviewIndex].location})
          </span>
        </div>

        <button 
          onClick={handleNextReview}
          className="btn btn-secondary"
          style={{ padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.8rem', marginTop: '0.5rem' }}
        >
          <ArrowRight size={14} style={{ marginRight: '4px' }} />
          {language === 'en' ? 'Next Review' : 'Prossima Recensione'}
        </button>
      </div>

    </div>
  );
};
