import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Clock, Mail, User, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Video, ArrowRight, Gift, CreditCard,
} from 'lucide-react';
import type { BookingPlan } from '../types/booking';
import type { AvailabilitySlot } from '../types/availability';
import type { LunaUser } from '../types/user';
import {
  EXTRA_LESSON_PRICE_LABEL,
  hasActiveSubscription,
  includedLessonsRemaining,
  INCLUDED_LESSONS_PER_CYCLE,
} from '../types/user';
import { formatSlotLabel, slotSeatsLeft } from '../types/availability';
import { loadAvailabilitySlots } from '../services/availabilityService';
import { bookAvailabilitySlot } from '../services/trialService';
import { startExtraLessonCheckout } from '../services/stripeService';

export type BookingMode = 'intro' | 'regular';

interface BookingCalendarProps {
  language: 'en' | 'it';
  userEmail: string;
  userName: string;
  currentUser: LunaUser;
  mode: BookingMode;
  defaultPlan?: BookingPlan;
  onBookingSuccess: () => void;
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({
  language,
  userEmail,
  userName,
  currentUser,
  mode,
  defaultPlan,
  onBookingSuccess,
}) => {
  const slotType = mode === 'intro' ? 'intro' : 'regular';
  const subscribed = hasActiveSubscription(currentUser);
  const includedLeft = includedLessonsRemaining(currentUser);

  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [level, setLevel] = useState('beginner');
  const [notes, setNotes] = useState('');
  const [lessonPlan, setLessonPlan] = useState<'included' | 'extra'>(
    defaultPlan === 'included' || includedLeft > 0 ? 'included' : 'extra',
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingCompleted, setBookingCompleted] = useState(false);
  const [meetLink, setMeetLink] = useState('');
  const [error, setError] = useState<string | null>(null);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const refreshSlots = useCallback(async () => {
    setLoadingSlots(true);
    try {
      setSlots(await loadAvailabilitySlots(slotType, todayIso));
    } catch (err) {
      console.error(err);
      setError(language === 'en' ? 'Could not load availability.' : 'Impossibile caricare la disponibilità.');
    } finally {
      setLoadingSlots(false);
    }
  }, [language, slotType, todayIso]);

  useEffect(() => {
    void refreshSlots();
  }, [refreshSlots]);

  const slotsForDate = useMemo(
    () => (selectedDate ? slots.filter((s) => s.date === selectedDate && slotSeatsLeft(s) > 0) : []),
    [selectedDate, slots],
  );

  const datesWithSlots = useMemo(() => new Set(slots.filter((s) => slotSeatsLeft(s) > 0).map((s) => s.date)), [slots]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayIndex = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotId || !name || !email) return;

    if (mode === 'regular' && !subscribed) {
      setError(
        language === 'en'
          ? 'An active subscription is required to book lessons with Luna.'
          : 'È necessario un abbonamento attivo per prenotare lezioni con Luna.',
      );
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      if (mode === 'intro') {
        const result = await bookAvailabilitySlot({
          slotId: selectedSlotId,
          name,
          email,
          level,
          notes,
          plan: 'trial_intro',
        });
        setMeetLink(result.meetLink);
        setBookingCompleted(true);
        return;
      }

      if (lessonPlan === 'extra') {
        const url = await startExtraLessonCheckout({
          slotId: selectedSlotId,
          name,
          email,
          level,
          notes,
          language,
        });
        window.location.href = url;
        return;
      }

      const result = await bookAvailabilitySlot({
        slotId: selectedSlotId,
        name,
        email,
        level,
        notes,
        plan: 'included',
      });
      setMeetLink(result.meetLink);
      setBookingCompleted(true);
    } catch (err) {
      console.error(err);
      setError(
        language === 'en'
          ? 'Booking failed. The slot may be full or no longer available.'
          : 'Prenotazione non riuscita. Lo slot potrebbe essere pieno o non più disponibile.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const formatMonthName = (date: Date) =>
    date.toLocaleDateString(language === 'en' ? 'en-US' : 'it-IT', { month: 'long', year: 'numeric' });

  if (bookingCompleted) {
    return (
      <div className="booking-view" style={{ maxWidth: '650px', margin: '0 auto' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', border: '2px solid var(--success)' }}>
          <CheckCircle2 size={48} color="var(--success)" style={{ margin: '0 auto' }} />
          <h2>{language === 'en' ? 'Booking confirmed!' : 'Prenotazione confermata!'}</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            {mode === 'intro'
              ? language === 'en'
                ? 'Your 30-minute intro videocall with Luna is booked. Join from your dashboard when it is time.'
                : 'La videocall introduttiva di 30 minuti con Luna è prenotata. Entra dalla dashboard quando è il momento.'
              : language === 'en'
                ? 'Your included lesson is reserved for this billing cycle.'
                : 'La lezione inclusa è riservata per questo ciclo di fatturazione.'}
          </p>
          {meetLink && (
            <a href={meetLink} className="btn btn-primary" style={{ alignSelf: 'center' }}>
              <Video size={16} />
              {language === 'en' ? 'Open videocall room' : 'Apri stanza videocall'}
            </a>
          )}
          <button type="button" className="btn btn-secondary" onClick={onBookingSuccess}>
            {language === 'en' ? 'Go to dashboard' : 'Vai alla dashboard'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-view" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ marginBottom: '0.4rem' }}>
          {mode === 'intro'
            ? language === 'en' ? 'Book intro videocall' : 'Prenota videocall introduttiva'
            : language === 'en' ? 'Book a lesson with Luna' : 'Prenota una lezione con Luna'}
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          {mode === 'intro'
            ? language === 'en'
              ? '30 minutes · up to 5 participants · included in your 7-day free trial'
              : '30 minuti · fino a 5 partecipanti · inclusa nei 7 giorni gratuiti'
            : subscribed
              ? language === 'en'
                ? `${includedLeft} of ${INCLUDED_LESSONS_PER_CYCLE} included lessons left this billing cycle. Extra lessons: ${EXTRA_LESSON_PRICE_LABEL}/h.`
                : `${includedLeft} di ${INCLUDED_LESSONS_PER_CYCLE} lezioni incluse rimaste in questo ciclo. Extra: ${EXTRA_LESSON_PRICE_LABEL}/h.`
              : language === 'en'
                ? 'Subscribe first to book live lessons with Luna.'
                : 'Abbonati prima per prenotare lezioni live con Luna.'}
        </p>
      </div>

      {mode === 'intro' && (
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <Gift size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {language === 'en'
              ? '7 days free: AI tutor + Luna Live (2 h/week) plus one intro group videocall.'
              : '7 giorni gratuiti: tutor AI + Luna Live (2 h/settimana) più una videocall introduttiva di gruppo.'}
          </p>
        </div>
      )}

      {error && <div className="luna-live-banner error">{error}</div>}

      <form onSubmit={(e) => void handleBook(e)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, textTransform: 'capitalize' }}>{formatMonthName(currentMonth)}</h3>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
                <ChevronLeft size={16} />
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {loadingSlots ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
              <Loader2 size={16} className="spin" />
              {language === 'en' ? 'Loading calendar…' : 'Caricamento calendario…'}
            </div>
          ) : slots.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {language === 'en'
                ? 'No slots published yet. Luna will open new dates soon.'
                : 'Nessuno slot pubblicato. Luna aprirà presto nuove date.'}
            </p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', marginBottom: '0.5rem' }}>
                {(language === 'en' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']).map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {[...Array(firstDayIndex)].map((_, i) => <div key={`e-${i}`} />)}
                {[...Array(daysInMonth)].map((_, i) => {
                  const day = i + 1;
                  const iso = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isPast = iso < todayIso;
                  const hasSlots = datesWithSlots.has(iso);
                  const isSelected = selectedDate === iso;
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={isPast || !hasSlots}
                      onClick={() => { setSelectedDate(iso); setSelectedSlotId(null); }}
                      style={{
                        aspectRatio: '1',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: isSelected ? 'var(--primary-glow)' : 'var(--bg-input)',
                        opacity: isPast || !hasSlots ? 0.35 : 1,
                        cursor: isPast || !hasSlots ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={16} />
            {language === 'en' ? 'Available slots' : 'Slot disponibili'}
          </h3>

          {!selectedDate ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {language === 'en' ? 'Select a highlighted date first.' : 'Seleziona prima una data evidenziata.'}
            </p>
          ) : slotsForDate.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {language === 'en' ? 'No open slots on this date.' : 'Nessuno slot libero in questa data.'}
            </p>
          ) : (
            slotsForDate.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSelectedSlotId(slot.id)}
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  textAlign: 'left',
                  border: selectedSlotId === slot.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: selectedSlotId === slot.id ? 'var(--primary-glow)' : 'var(--bg-input)',
                }}
              >
                <strong>{formatSlotLabel(slot)}</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {mode === 'intro'
                    ? language === 'en'
                      ? `${slotSeatsLeft(slot)} seats left (max ${slot.maxParticipants})`
                      : `${slotSeatsLeft(slot)} posti liberi (max ${slot.maxParticipants})`
                    : language === 'en' ? '1-on-1 lesson (60 min)' : 'Lezione individuale (60 min)'}
                </div>
              </button>
            ))
          )}

          <div style={{ position: 'relative' }}>
            <User size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-light)' }} />
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder={language === 'en' ? 'Your name' : 'Il tuo nome'} style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.2rem' }} />
          </div>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-light)' }} />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.2rem' }} />
          </div>

          {mode === 'regular' && subscribed && (
            <select
              value={lessonPlan}
              onChange={(e) => setLessonPlan(e.target.value as 'included' | 'extra')}
              style={{ width: '100%', padding: '0.6rem 1rem' }}
            >
              {includedLeft > 0 && (
                <option value="included">
                  {language === 'en'
                    ? `Included lesson (${includedLeft} left this cycle)`
                    : `Lezione inclusa (${includedLeft} rimaste nel ciclo)`}
                </option>
              )}
              <option value="extra">
                {language === 'en'
                  ? `Extra lesson — pay ${EXTRA_LESSON_PRICE_LABEL}`
                  : `Lezione extra — paga ${EXTRA_LESSON_PRICE_LABEL}`}
              </option>
            </select>
          )}

          <select value={level} onChange={(e) => setLevel(e.target.value)} style={{ width: '100%', padding: '0.6rem 1rem' }}>
            <option value="beginner">{language === 'en' ? 'Beginner' : 'Principiante'}</option>
            <option value="intermediate">{language === 'en' ? 'Intermediate' : 'Intermedio'}</option>
            <option value="fluent">{language === 'en' ? 'Advanced' : 'Avanzato'}</option>
          </select>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={language === 'en' ? 'Notes (optional)' : 'Note (opzionale)'}
            rows={2}
            style={{ width: '100%', padding: '0.6rem 1rem', resize: 'vertical' }}
          />

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!selectedSlotId || isProcessing || (mode === 'regular' && !subscribed)}
          >
            {isProcessing ? <Loader2 size={16} className="spin" /> : mode === 'regular' && lessonPlan === 'extra' ? <CreditCard size={16} /> : <ArrowRight size={16} />}
            {mode === 'intro'
              ? language === 'en' ? 'Confirm intro call' : 'Conferma call intro'
              : lessonPlan === 'extra'
                ? language === 'en' ? 'Pay & book extra lesson' : 'Paga e prenota lezione extra'
                : language === 'en' ? 'Book included lesson' : 'Prenota lezione inclusa'}
          </button>
        </div>
      </form>
    </div>
  );
};
