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
  extraRebookCreditRemaining,
  replacementLessonCreditRemaining,
  INCLUDED_LESSONS_PER_CYCLE,
} from '../types/user';
import type { UserCouponSummary } from '../types/coupon';
import {
  formatSlotLabel,
  oppositeSlotType,
  otherModeAvailabilityHint,
  slotSeatsLeft,
} from '../types/availability';
import { loadAvailabilitySlots } from '../services/availabilityService';
import { listTeachers } from '../services/userService';
import type { BookableTeacher } from '../types/teacher';
import { getTeacherPublicName } from '../types/teacher';
import { bookAvailabilitySlot, formatBookingCallableError } from '../services/trialService';
import { formatEmailCallableError, rescheduleBookingRemote } from '../services/emailService';
import { checkGraceNoSlotsCoupon, loadUserCoupons } from '../services/couponService';
import { startExtraLessonCheckout } from '../services/stripeService';
import { PremiumUpgradeButton } from './PremiumUpgradeButton';
import { SHOW_TEACHER_PICKER_UI } from '../constants/booking';

type LessonPlan = 'included' | 'extra' | 'extra_rebook' | 'coupon' | 'replacement';

export type BookingMode = 'intro' | 'regular';

interface BookingCalendarProps {
  language: 'en' | 'it';
  userEmail: string;
  userName: string;
  currentUser: LunaUser;
  mode: BookingMode;
  defaultPlan?: BookingPlan;
  rescheduleBookingId?: string | null;
  onBookingSuccess: () => void;
  embedded?: boolean;
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({
  language,
  userEmail,
  userName,
  currentUser,
  mode,
  defaultPlan,
  rescheduleBookingId = null,
  onBookingSuccess,
  embedded = false,
}) => {
  const viewClass = embedded ? 'booking-view' : 'page-view booking-view';
  const isReschedule = Boolean(rescheduleBookingId);
  const slotType = mode === 'intro' ? 'intro' : 'regular';
  const subscribed = hasActiveSubscription(currentUser);
  const includedLeft = includedLessonsRemaining(currentUser);
  const extraRebookLeft = extraRebookCreditRemaining(currentUser);
  const replacementLeft = replacementLessonCreditRemaining(currentUser);
  const [userCoupons, setUserCoupons] = useState<UserCouponSummary[]>([]);
  const freeLessonCoupons = useMemo(
    () => userCoupons.filter((coupon) => coupon.type === 'free_lesson'),
    [userCoupons],
  );
  const discountCoupons = useMemo(
    () => userCoupons.filter((coupon) => coupon.type === 'percent_off_extra'),
    [userCoupons],
  );
  const canBookWithoutSub =
    subscribed
    || extraRebookLeft > 0
    || replacementLeft > 0
    || freeLessonCoupons.length > 0
    || isReschedule;

  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [otherTypeHasSlots, setOtherTypeHasSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [level, setLevel] = useState('beginner');
  const [notes, setNotes] = useState('');
  const [lessonPlan, setLessonPlan] = useState<LessonPlan>(
    freeLessonCoupons.length > 0 && !subscribed
      ? 'coupon'
      : replacementLeft > 0 && !subscribed
        ? 'replacement'
        : extraRebookLeft > 0 && includedLeft === 0
          ? 'extra_rebook'
          : defaultPlan === 'included' || includedLeft > 0
            ? 'included'
            : 'extra',
  );
  const [selectedCouponId, setSelectedCouponId] = useState('');
  const [selectedDiscountCouponId, setSelectedDiscountCouponId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingCompleted, setBookingCompleted] = useState(false);
  const [meetLink, setMeetLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<BookableTeacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  const showTeacherPicker = SHOW_TEACHER_PICKER_UI && teachers.length > 1;

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    void listTeachers({ slotType, fromDate: todayIso })
      .then((list) => {
        setTeachers(list);
        if (list.length > 0) {
          setSelectedTeacherId((prev) =>
            prev && list.some((t) => t.id === prev) ? prev : list[0].id,
          );
        }
      })
      .catch(() => {
        setError(
          language === 'en'
            ? 'Could not load teachers. Try again in a moment.'
            : 'Impossibile caricare i maestri. Riprova tra poco.',
        );
      })
      .finally(() => setLoadingTeachers(false));
  }, [language, slotType, todayIso]);

  const refreshSlots = useCallback(async () => {
    if (!selectedTeacherId) {
      setSlots([]);
      setOtherTypeHasSlots(false);
      setLoadingSlots(false);
      return;
    }
    setLoadingSlots(true);
    try {
      const loaded = await loadAvailabilitySlots({ slotType, fromDate: todayIso, teacherId: selectedTeacherId });
      setSlots(loaded);
      if (loaded.length === 0) {
        const other = await loadAvailabilitySlots({
          slotType: oppositeSlotType(slotType),
          fromDate: todayIso,
          teacherId: selectedTeacherId,
        });
        setOtherTypeHasSlots(other.length > 0);
      } else {
        setOtherTypeHasSlots(false);
      }
    } catch (err) {
      console.error(err);
      setOtherTypeHasSlots(false);
      setError(language === 'en' ? 'Could not load availability.' : 'Impossibile caricare la disponibilità.');
    } finally {
      setLoadingSlots(false);
    }
  }, [language, slotType, todayIso, selectedTeacherId]);

  useEffect(() => {
    void refreshSlots();
  }, [refreshSlots]);

  useEffect(() => {
    void loadUserCoupons(currentUser.id)
      .then(setUserCoupons)
      .catch(console.error);
  }, [currentUser.id]);

  useEffect(() => {
    if (freeLessonCoupons.length > 0 && !selectedCouponId) {
      setSelectedCouponId(freeLessonCoupons[0].couponId);
    }
    if (discountCoupons.length > 0 && !selectedDiscountCouponId) {
      setSelectedDiscountCouponId(discountCoupons[0].couponId);
    }
  }, [discountCoupons, freeLessonCoupons, selectedCouponId, selectedDiscountCouponId]);

  const slotsForDate = useMemo(
    () => (selectedDate ? slots.filter((s) => s.date === selectedDate && slotSeatsLeft(s) > 0) : []),
    [selectedDate, slots],
  );

  const datesWithSlots = useMemo(() => new Set(slots.filter((s) => slotSeatsLeft(s) > 0).map((s) => s.date)), [slots]);

  useEffect(() => {
    if (mode !== 'regular' || datesWithSlots.size > 0) return;
    if (!includedLeft && !extraRebookLeft && !replacementLeft && freeLessonCoupons.length === 0) return;
    void checkGraceNoSlotsCoupon()
      .then((result) => {
        if (result.issued) {
          return loadUserCoupons(currentUser.id).then(setUserCoupons);
        }
        return undefined;
      })
      .catch(console.error);
  }, [
    currentUser.id,
    datesWithSlots.size,
    extraRebookLeft,
    freeLessonCoupons.length,
    includedLeft,
    mode,
    replacementLeft,
  ]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayIndex = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotId || !name || !email) return;
    if (!selectedTeacherId) {
      setError(
        language === 'en' ? 'Choose a teacher first.' : 'Scegli prima un maestro.',
      );
      return;
    }

    if (mode === 'regular' && !canBookWithoutSub) {
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
      if (isReschedule && rescheduleBookingId) {
        await rescheduleBookingRemote(rescheduleBookingId, selectedSlotId);
        setBookingCompleted(true);
        onBookingSuccess();
        return;
      }

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
          discountCouponId: selectedDiscountCouponId || undefined,
        });
        window.location.href = url;
        return;
      }

      if (lessonPlan === 'coupon') {
        if (!selectedCouponId) {
          setError(language === 'en' ? 'Select a lesson coupon.' : 'Seleziona un coupon lezione.');
          return;
        }
        const result = await bookAvailabilitySlot({
          slotId: selectedSlotId,
          name,
          email,
          level,
          notes,
          plan: 'coupon',
          couponId: selectedCouponId,
        });
        setMeetLink(result.meetLink);
        setBookingCompleted(true);
        return;
      }

      if (lessonPlan === 'replacement') {
        const result = await bookAvailabilitySlot({
          slotId: selectedSlotId,
          name,
          email,
          level,
          notes,
          plan: 'replacement',
        });
        setMeetLink(result.meetLink);
        setBookingCompleted(true);
        return;
      }

      if (lessonPlan === 'extra_rebook') {
        const result = await bookAvailabilitySlot({
          slotId: selectedSlotId,
          name,
          email,
          level,
          notes,
          plan: 'extra_rebook',
        });
        setMeetLink(result.meetLink);
        setBookingCompleted(true);
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
        isReschedule
          ? formatEmailCallableError(err, language)
          : formatBookingCallableError(err, language),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const formatMonthName = (date: Date) =>
    date.toLocaleDateString(language === 'en' ? 'en-US' : 'it-IT', { month: 'long', year: 'numeric' });

  if (mode === 'regular' && !canBookWithoutSub && !isReschedule) {
    return (
      <div className={viewClass}>
        <div
          className="glass-panel"
          style={{
            padding: '2.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem',
            maxWidth: 520,
            margin: '0 auto',
            border: '2px solid var(--primary)',
          }}
        >
          <CreditCard size={48} style={{ color: 'var(--primary)' }} />
          <h2 style={{ margin: 0 }}>
            {language === 'en' ? 'Subscribe to book lessons' : 'Abbonati per prenotare lezioni'}
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            {language === 'en'
              ? `Live 1-on-1 lessons with Luna are included in the monthly plan (${INCLUDED_LESSONS_PER_CYCLE} × 60 min per billing cycle). Complete payment with Stripe first, then you can book your slots.`
              : `Le lezioni live individuali con Luna sono incluse nell'abbonamento mensile (${INCLUDED_LESSONS_PER_CYCLE} × 60 min per ciclo). Completa prima il pagamento con Stripe, poi potrai prenotare gli slot.`}
          </p>
          <PremiumUpgradeButton
            language={language}
            className="btn btn-primary"
            style={{ width: '100%' }}
          />
        </div>
      </div>
    );
  }

  if (bookingCompleted) {
    return (
      <div className={viewClass}>
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', border: '2px solid var(--success)' }}>
          <CheckCircle2 size={48} color="var(--success)" style={{ margin: '0 auto' }} />
          <h2>{language === 'en' ? 'Booking confirmed!' : 'Prenotazione confermata!'}</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            {language === 'en'
              ? 'Your lesson is booked. You will receive the video link by email once your teacher adds it.'
              : 'Lezione prenotata. Riceverai il link video via email appena il maestro lo inserirà.'}
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
    <div className={viewClass} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ marginBottom: '0.4rem' }}>
          {isReschedule
            ? (language === 'en' ? 'Reschedule your lesson' : 'Riprogramma la lezione')
            : mode === 'intro'
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

      {loadingTeachers ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 size={28} className="spin" /></div>
      ) : teachers.length === 0 ? (
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          {language === 'en' ? 'No teachers available for booking yet.' : 'Nessun maestro disponibile per le prenotazioni.'}
        </div>
      ) : (
        <>
      {showTeacherPicker && (
      <div className="glass-panel booking-teacher-picker" style={{ padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>
          {language === 'en' ? '1. Choose your teacher' : '1. Scegli il maestro'}
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {teachers.map((t) => (
            <button
              key={t.id}
              type="button"
              className={selectedTeacherId === t.id ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => {
                setSelectedTeacherId(t.id);
                setSelectedDate(null);
                setSelectedSlotId(null);
              }}
            >
              {getTeacherPublicName(t)}
            </button>
          ))}
        </div>
      </div>
      )}

      {!selectedTeacherId ? null : (
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
              {otherTypeHasSlots
                ? otherModeAvailabilityHint(language, slotType)
                : language === 'en'
                  ? (slotType === 'intro'
                    ? 'No Intro 30′ (trial) slots published yet. Regular 60′ lessons are booked separately.'
                    : 'No Regular 60′ slots published yet. Intro (trial) slots are booked separately.')
                  : (slotType === 'intro'
                    ? 'Nessuno slot Intro 30′ (prova) pubblicato. Le lezioni 60′ si prenotano separatamente.'
                    : 'Nessuno slot Lezione 60′ pubblicato. Gli slot Intro (prova) si prenotano separatamente.')}
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

          {mode === 'regular' && canBookWithoutSub && (
            <>
              <select
                value={lessonPlan}
                onChange={(e) => setLessonPlan(e.target.value as LessonPlan)}
                style={{ width: '100%', padding: '0.6rem 1rem' }}
              >
                {includedLeft > 0 && subscribed && (
                  <option value="included">
                    {language === 'en'
                      ? `Included lesson (${includedLeft} left this cycle)`
                      : `Lezione inclusa (${includedLeft} rimaste nel ciclo)`}
                  </option>
                )}
                {replacementLeft > 0 && (
                  <option value="replacement">
                    {language === 'en'
                      ? `Replacement lesson (${replacementLeft} credit)`
                      : `Lezione sostitutiva (${replacementLeft} credito)`}
                  </option>
                )}
                {freeLessonCoupons.length > 0 && (
                  <option value="coupon">
                    {language === 'en'
                      ? `Free lesson coupon (${freeLessonCoupons.length})`
                      : `Coupon lezione gratuita (${freeLessonCoupons.length})`}
                  </option>
                )}
                {extraRebookLeft > 0 && (
                  <option value="extra_rebook">
                    {language === 'en'
                      ? `Extra rebook (${extraRebookLeft} credit — no payment)`
                      : `Riprenotazione extra (${extraRebookLeft} credito — senza pagamento)`}
                  </option>
                )}
                {(subscribed || discountCoupons.length > 0) && (
                  <option value="extra">
                    {language === 'en'
                      ? `Extra lesson — pay ${EXTRA_LESSON_PRICE_LABEL}`
                      : `Lezione extra — paga ${EXTRA_LESSON_PRICE_LABEL}`}
                  </option>
                )}
              </select>
              {lessonPlan === 'coupon' && freeLessonCoupons.length > 1 && (
                <select
                  value={selectedCouponId}
                  onChange={(e) => setSelectedCouponId(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 1rem' }}
                >
                  {freeLessonCoupons.map((coupon) => (
                    <option key={coupon.couponId} value={coupon.couponId}>
                      {language === 'en' ? 'Expires' : 'Scade'} {new Date(coupon.expiresAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              )}
              {lessonPlan === 'extra' && discountCoupons.length > 0 && (
                <select
                  value={selectedDiscountCouponId}
                  onChange={(e) => setSelectedDiscountCouponId(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 1rem' }}
                >
                  <option value="">
                    {language === 'en' ? 'No discount' : 'Nessuno sconto'}
                  </option>
                  {discountCoupons.map((coupon) => (
                    <option key={coupon.couponId} value={coupon.couponId}>
                      {language === 'en'
                        ? `${coupon.percentOff ?? 20}% off — expires ${new Date(coupon.expiresAt).toLocaleDateString()}`
                        : `${coupon.percentOff ?? 20}% sconto — scade ${new Date(coupon.expiresAt).toLocaleDateString()}`}
                    </option>
                  ))}
                </select>
              )}
            </>
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
            disabled={!selectedSlotId || isProcessing || (mode === 'regular' && !canBookWithoutSub && !isReschedule)}
          >
            {isProcessing ? <Loader2 size={16} className="spin" /> : mode === 'regular' && lessonPlan === 'extra' ? <CreditCard size={16} /> : <ArrowRight size={16} />}
            {mode === 'intro'
              ? language === 'en' ? 'Confirm intro call' : 'Conferma call intro'
              : lessonPlan === 'extra'
                ? language === 'en' ? 'Pay & book extra lesson' : 'Paga e prenota lezione extra'
                : lessonPlan === 'extra_rebook'
                  ? language === 'en' ? 'Book with rebook credit' : 'Prenota con credito riprenotazione'
                  : lessonPlan === 'coupon'
                    ? language === 'en' ? 'Book with coupon' : 'Prenota con coupon'
                    : lessonPlan === 'replacement'
                      ? language === 'en' ? 'Book replacement lesson' : 'Prenota lezione sostitutiva'
                      : language === 'en' ? 'Book included lesson' : 'Prenota lezione inclusa'}
          </button>
        </div>
      </form>
      )}
        </>
      )}
    </div>
  );
};
