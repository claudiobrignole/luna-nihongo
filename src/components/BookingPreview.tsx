import { Calendar, Clock, CreditCard, Mail, User, Video, ArrowRight } from 'lucide-react';
import type { LanguageType } from './Header';

interface BookingPreviewProps {
  language: LanguageType;
  onRegister: () => void;
}

/**
 * Static preview of the live-lesson booking flow.
 * Extend this component when real scheduling/payments are wired.
 */
export function BookingPreview({ language, onRegister }: BookingPreviewProps) {
  return (
    <div className="booking-preview page-view">
      <header className="booking-preview-header">
        <h2>{language === 'en' ? 'Book a lesson with Luna' : 'Prenota una lezione con Luna'}</h2>
        <p>
          {language === 'en'
            ? 'Preview of the online booking flow — calendar, details, and confirmation. Full booking unlocks after free registration.'
            : 'Anteprima del flusso di prenotazione online — calendario, dati e conferma. La prenotazione completa si sblocca dopo la registrazione gratuita.'}
        </p>
      </header>

      <div className="booking-preview-grid">
        <section className="booking-preview-calendar glass-panel" aria-hidden="true">
          <div className="booking-preview-cal-head">
            <Calendar size={18} />
            <strong>{language === 'en' ? 'March 2026' : 'Marzo 2026'}</strong>
          </div>
          <div className="booking-preview-cal-grid">
            {Array.from({ length: 28 }, (_, i) => (
              <span
                key={i}
                className={`booking-preview-day ${[5, 12, 19].includes(i) ? 'available' : ''} ${i === 12 ? 'selected' : ''}`}
              >
                {i + 1}
              </span>
            ))}
          </div>
          <div className="booking-preview-slots">
            <Clock size={16} />
            <span>14:30 – 15:30</span>
            <span className="muted">18:30 – 19:30</span>
          </div>
        </section>

        <section className="booking-preview-form glass-panel">
          <h3>{language === 'en' ? 'Your details' : 'I tuoi dati'}</h3>
          <div className="booking-preview-fields">
            <label>
              <User size={16} />
              <input type="text" disabled placeholder={language === 'en' ? 'Name' : 'Nome'} defaultValue="—" />
            </label>
            <label>
              <Mail size={16} />
              <input type="email" disabled placeholder="email@esempio.it" />
            </label>
            <label>
              <span>{language === 'en' ? 'Level' : 'Livello'}</span>
              <select disabled defaultValue="beginner">
                <option>{language === 'en' ? 'Beginner' : 'Principiante'}</option>
              </select>
            </label>
          </div>

          <div className="booking-preview-payment glass-panel">
            <CreditCard size={18} />
            <div>
              <strong>{language === 'en' ? 'Payment (preview)' : 'Pagamento (anteprima)'}</strong>
              <p>{language === 'en' ? 'Single lesson or subscription — coming soon.' : 'Lezione singola o abbonamento — in arrivo.'}</p>
            </div>
          </div>

          <div className="booking-preview-meet">
            <Video size={18} />
            <span>{language === 'en' ? 'Google Meet link after confirmation' : 'Link Google Meet dopo la conferma'}</span>
          </div>

          <button type="button" className="btn btn-primary" onClick={onRegister}>
            {language === 'en' ? 'Register to book' : 'Registrati per prenotare'}
            <ArrowRight size={18} />
          </button>
        </section>
      </div>
    </div>
  );
}
