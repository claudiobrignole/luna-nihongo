import React, { useState } from 'react';
import { Award, BookOpen, Clock, Globe, ArrowRight, MessageSquare, Star, ShieldCheck } from 'lucide-react';

interface TeacherProfileProps {
  language: 'en' | 'it';
  onNavigateToBooking: () => void;
}

export const TeacherProfile: React.FC<TeacherProfileProps> = ({ language, onNavigateToBooking }) => {
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
            <h4 style={{ marginBottom: '0.5rem' }}>{language === 'en' ? 'Perfect Calendar Sync' : 'Calendario Integrato'}</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {language === 'en'
                ? "Book slots, process payments, and receive a Google Calendar invite with a Google Meet link. Everything is handled within the app."
                : "Prenota gli orari, paga online in sicurezza e ricevi l'invito su Google Calendar con link Google Meet. Tutto gestito qui."}
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
          
          {/* Plan 1: Single Lesson */}
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
              position: 'relative'
            }}
          >
            <h4 style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>
              {language === 'en' ? 'Single Lesson' : 'Lezione Singola'}
            </h4>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)' }}>CHF 35</span>
              <span style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>/ hr</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', minHeight: '60px' }}>
              {language === 'en'
                ? 'Ideal for checking your progress, asking grammar doubts, or preparation for JLPT exams.'
                : 'Ideale per chiarire dubbi grammaticali specifici, fare conversazione sporadica o ripasso pre-esami.'}
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
              <div>✔️ 60-minute lesson (Google Meet)</div>
              <div>✔️ Free lesson study summary</div>
              <div>✔️ Customizable availability booking</div>
            </div>
            <button 
              onClick={onNavigateToBooking}
              className="btn btn-secondary" 
              style={{ width: '100%', marginTop: 'auto' }}
            >
              {language === 'en' ? 'Book Single Lesson' : 'Prenota Singola'}
            </button>
          </div>

          {/* Plan 2: Subscription Package */}
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
              <span style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)' }}>CHF 119</span>
              <span style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>/ mo</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', minHeight: '60px' }}>
              {language === 'en'
                ? 'Best for students looking to make rapid progress and build consistent language study habits.'
                : 'La scelta migliore per chi vuole fare progressi rapidi e mantenere un ritmo di studio costante.'}
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
              <div>✔️ **4 x 60-min lessons** (1 per week)</div>
              <div>✔️ Personalized study folder</div>
              <div>✔️ Direct homework review via WhatsApp</div>
              <div>✔️ Priority support for reschedule slots</div>
            </div>
            <button 
              onClick={onNavigateToBooking}
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: 'auto' }}
            >
              {language === 'en' ? 'Subscribe Now' : 'Abbonati Ora'}
            </button>
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
