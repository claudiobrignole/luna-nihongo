import type { RefObject } from 'react';
import type { LunaUser } from '../types/user';
import {
  hasActiveSubscription,
  isTrialActive,
  trialDaysRemaining,
  includedLessonsRemaining,
  MONTHLY_SUBSCRIPTION_LABEL,
  EXTRA_LESSON_PRICE_LABEL,
  AI_MINUTES_WEEKLY,
} from '../types/user';
import { FreeTrialButton } from './FreeTrialButton';
import { PremiumUpgradeButton } from './PremiumUpgradeButton';
import { BookingPreview } from './BookingPreview';
import { BookingCalendar, type BookingMode } from './BookingCalendar';
import { LUNA_PROFILE } from '../content/lunaProfile';

interface TeacherProfileProps {
  language: 'en' | 'it';
  currentUser?: LunaUser;
  bookingMode?: BookingMode;
  rescheduleBookingId?: string | null;
  bookingSectionRef?: RefObject<HTMLElement | null>;
  onScrollToBooking: (mode: 'intro' | 'regular') => void;
  onTrialRefresh?: () => void | Promise<void>;
  onRequireAuth?: () => void;
  onBookingSuccess?: () => void;
}

export function TeacherProfile({
  language,
  currentUser,
  bookingMode = 'regular',
  rescheduleBookingId = null,
  bookingSectionRef,
  onScrollToBooking,
  onTrialRefresh,
  onRequireAuth,
  onBookingSuccess,
}: TeacherProfileProps) {
  const lang = language;
  const copy = LUNA_PROFILE;
  const subscribed = currentUser ? hasActiveSubscription(currentUser) : false;
  const includedLeft = currentUser ? includedLessonsRemaining(currentUser) : 0;
  const trialActive = currentUser ? isTrialActive(currentUser) : false;
  const trialDays = currentUser ? trialDaysRemaining(currentUser) : 0;
  const showPricing = !subscribed;

  return (
    <div className="teacher-profile-view page-view">
      <div className="glass-panel luna-profile-bio">
        <div className="luna-photo-placeholder">
          <img
            src={copy.photo}
            alt={copy.photoAlt[lang]}
            className="luna-photo"
            width={312}
            height={312}
            loading="lazy"
            decoding="async"
          />
        </div>

        <div className="luna-profile-copy">
          <span className="luna-profile-badge">{copy.badge[lang]}</span>
          <h2 className="luna-profile-title">{copy.title[lang]}</h2>
          <p className="luna-profile-lead">{copy.lead[lang]}</p>
          <ul className="luna-profile-bullets">
            {copy.bullets[lang].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {showPricing && (
        <div className="luna-pricing-section">
          <h3 className="luna-section-title">
            {lang === 'en' ? 'Lesson Plans & Investment' : 'Piani di Studio e Tariffe'}
          </h3>

          <div className="luna-pricing-grid">
            <div className="glass-panel luna-pricing-card">
              <div className="luna-pricing-ribbon luna-pricing-ribbon--yellow">
                {lang === 'en' ? 'NEW' : 'NOVITÀ'}
              </div>
              <h4 className="luna-pricing-plan-name">
                {lang === 'en' ? '7 days free' : '7 giorni gratuiti'}
              </h4>
              <div className="luna-pricing-price">
                {lang === 'en' ? '7 days' : '7 giorni'}
              </div>
              <p className="luna-pricing-desc">
                {lang === 'en'
                  ? 'AI tutor and Luna Live (2 h/week rolling), plus one 30-minute intro group videocall with Luna (up to 5 participants). One trial per account.'
                  : 'Tutor AI e Luna Live (2 h/settimana rolling), più una videocall introduttiva di gruppo da 30 minuti con Luna (fino a 5 partecipanti). Una prova per account.'}
              </p>
              <ul className="luna-pricing-features">
                <li>
                  {lang === 'en'
                    ? `AI tutor + Luna Live (${AI_MINUTES_WEEKLY / 60} h/week)`
                    : `Tutor AI + Luna Live (${AI_MINUTES_WEEKLY / 60} h/settimana)`}
                </li>
                <li>{lang === 'en' ? '30-min intro videocall' : 'Videocall introduttiva 30 min'}</li>
                <li>
                  {lang === 'en'
                    ? 'Lessons & flashcards stay free after trial'
                    : 'Lezioni e flashcard restano free dopo la prova'}
                </li>
              </ul>
              {trialActive && (
                <p className="luna-pricing-trial-note">
                  {lang === 'en'
                    ? `${trialDays} day(s) left in your trial`
                    : `${trialDays} giorno/i rimasti di prova`}
                </p>
              )}
              {currentUser ? (
                <FreeTrialButton
                  language={lang}
                  trialUsed={currentUser.trialUsed}
                  hasPremium={subscribed}
                  onTrialStarted={() => onTrialRefresh?.()}
                  onBookIntro={() => onScrollToBooking('intro')}
                  className="btn btn-accent luna-pricing-cta"
                />
              ) : (
                <button type="button" className="btn btn-accent luna-pricing-cta" onClick={onRequireAuth}>
                  {lang === 'en' ? 'Register for free trial' : 'Registrati per la prova'}
                </button>
              )}
            </div>

            <div className="glass-panel luna-pricing-card luna-pricing-card--featured">
              <div className="luna-pricing-ribbon luna-pricing-ribbon--red">
                {lang === 'en' ? 'BEST VALUE (15% OFF)' : 'CONSIGLIATO (15% SCONTO)'}
              </div>
              <h4 className="luna-pricing-plan-name">
                {lang === 'en' ? 'Monthly Sub' : 'Abbonamento Mensile'}
              </h4>
              <div className="luna-pricing-price">
                {MONTHLY_SUBSCRIPTION_LABEL}
                <span className="luna-pricing-price-suffix">/ mo</span>
              </div>
              <p className="luna-pricing-desc">
                {lang === 'en'
                  ? 'AI tutor (2 h/week), Luna memory, 2 individual 60-min lessons per billing cycle. Unused lessons expire at cycle end. Extra lessons available.'
                  : 'Tutor AI (2 h/settimana), memoria Luna, 2 lezioni individuali da 60 min per ciclo di fatturazione. Le lezioni non usate scadono a fine ciclo. Lezioni extra disponibili.'}
              </p>
              <ul className="luna-pricing-features">
                <li>
                  {lang === 'en'
                    ? '2 × 60-min 1-on-1 lessons / cycle'
                    : '2 lezioni individuali da 60 min / ciclo'}
                </li>
                <li>
                  {lang === 'en'
                    ? `AI tutor + Luna Live (${AI_MINUTES_WEEKLY / 60} h/week)`
                    : `Tutor AI + Luna Live (${AI_MINUTES_WEEKLY / 60} h/settimana)`}
                </li>
                <li>
                  {lang === 'en'
                    ? `Extra lessons ${EXTRA_LESSON_PRICE_LABEL}/h`
                    : `Lezioni extra ${EXTRA_LESSON_PRICE_LABEL}/h`}
                </li>
                <li>
                  {lang === 'en'
                    ? 'Unused included lessons do not roll over'
                    : 'Le ore non usate non sono recuperabili il mese successivo'}
                </li>
              </ul>
              {subscribed ? (
                <button
                  type="button"
                  onClick={() => onScrollToBooking('regular')}
                  className="btn btn-primary luna-pricing-cta"
                >
                  {lang === 'en'
                    ? `Book lessons (${includedLeft} included left)`
                    : `Prenota lezioni (${includedLeft} incluse rimaste)`}
                </button>
              ) : (
                <PremiumUpgradeButton
                  language={lang}
                  onRequireAuth={onRequireAuth}
                  className="btn btn-primary luna-pricing-cta"
                />
              )}
            </div>
          </div>
        </div>
      )}

      <section
        id="luna-booking"
        ref={bookingSectionRef}
        className="luna-booking-section"
        aria-label={lang === 'en' ? 'Book a lesson' : 'Prenota una lezione'}
      >
        {currentUser && onBookingSuccess ? (
          <BookingCalendar
            language={lang}
            userEmail={currentUser.email}
            userName={currentUser.username}
            currentUser={currentUser}
            mode={bookingMode}
            defaultPlan={bookingMode === 'regular' ? 'included' : 'trial_intro'}
            rescheduleBookingId={rescheduleBookingId}
            onBookingSuccess={onBookingSuccess}
            embedded
          />
        ) : (
          <BookingPreview
            language={lang}
            onRegister={() => onRequireAuth?.()}
            embedded
          />
        )}
      </section>
    </div>
  );
}
