import { useState } from 'react';
import { Clock, CreditCard, Mail, User, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Video, ArrowRight } from 'lucide-react';
import { createBooking } from '../services/bookingService';

interface BookingCalendarProps {
  language: 'en' | 'it';
  userId: string;
  onBookingSuccess: () => void;
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({ language, userId, onBookingSuccess }) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [level, setLevel] = useState('beginner');
  const [notes, setNotes] = useState('');
  const [paymentPlan, setPaymentPlan] = useState<'single' | 'subscription'>('single');
  
  // Payment Card Mock State
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // Process States
  const [step, setStep] = useState<1 | 2>(1); // 1: Select Slot & Info, 2: Payment
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingCompleted, setBookingCompleted] = useState(false);
  const [generatedMeetLink, setGeneratedMeetLink] = useState('');

  // Standard Mock Time slots
  const mockSlots = ['09:00 - 10:00', '11:00 - 12:00', '14:30 - 15:30', '16:00 - 17:00', '18:30 - 19:30'];

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentMonth);

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    
    // Can't book in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (clickedDate < today) return;

    setSelectedDate(clickedDate);
    setSelectedSlot(null);
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedSlot || !name || !email) return;
    setStep(2);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardExpiry || !cardCvc || !selectedDate || !selectedSlot) return;

    setIsProcessing(true);

    setTimeout(async () => {
      const alphabet = 'abcdefghijklmnopqrstuvwxyz';
      const rWord = (len: number) => Array.from({ length: len }, () => alphabet[Math.floor(Math.random() * 26)]).join('');
      const meet = `https://meet.google.com/${rWord(3)}-${rWord(4)}-${rWord(3)}`;
      setGeneratedMeetLink(meet);

      try {
        await createBooking(userId, {
          name,
          email,
          level,
          notes,
          date: selectedDate.toISOString().split('T')[0],
          time: selectedSlot,
          plan: paymentPlan,
          meetLink: meet,
          price: paymentPlan === 'single' ? 'CHF 35' : 'CHF 119/mo (Sub)',
        });
        setIsProcessing(false);
        setBookingCompleted(true);
      } catch (err) {
        console.error('Booking save failed', err);
        setIsProcessing(false);
      }
    }, 2500);
  };

  const formatMonthName = (date: Date) => {
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'it-IT', { month: 'long', year: 'numeric' });
  };

  const formatFullDate = (date: Date) => {
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <div className="booking-view" style={{ maxWidth: '750px', margin: '0 auto' }}>
      
      {bookingCompleted ? (
        /* SUCCESS SCREEN */
        <div 
          className="glass-panel"
          style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            borderRadius: '24px',
            border: '2px solid var(--success)',
            background: 'linear-gradient(135deg, var(--bg-panel), var(--success-glow))'
          }}
        >
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'var(--success-glow)',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CheckCircle2 size={48} />
          </div>

          <h2>{language === 'en' ? 'Booking Confirmed!' : 'Prenotazione Confermata!'}</h2>

          <div style={{ fontSize: '1.1rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div>
              📅 <strong>{selectedDate && formatFullDate(selectedDate)}</strong>
            </div>
            <div>
              ⏰ <strong>{selectedSlot}</strong>
            </div>
            <div>
              💳 {paymentPlan === 'single' 
                ? (language === 'en' ? 'Single Lesson Paid (CHF 35)' : 'Lezione Singola Pagata (CHF 35)')
                : (language === 'en' ? 'Monthly Subscription Active (CHF 119/mo)' : 'Abbonamento Mensile Attivo (CHF 119/mese)')}
            </div>
          </div>

          {/* Google Meet Info Box */}
          <div 
            className="glass-panel"
            style={{
              padding: '1.2rem',
              width: '100%',
              maxWidth: '500px',
              backgroundColor: 'var(--bg-input)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.8rem',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600 }}>
              <Video size={20} />
              <span>Google Meet Generated</span>
            </div>
            <a 
              href={generatedMeetLink} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                fontSize: '0.95rem',
                color: 'var(--primary)',
                textDecoration: 'underline',
                wordBreak: 'break-all',
                fontWeight: 600
              }}
            >
              {generatedMeetLink}
            </a>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {language === 'en'
                ? "An email invitation has been sent to you. The meet link is also unlocked on your Dashboard."
                : "Ti abbiamo inviato un invito e-mail. Il link Meet è sbloccato anche sulla tua Dashboard."}
            </p>
          </div>

          <button 
            onClick={onBookingSuccess}
            className="btn btn-primary"
            style={{ width: '100%', maxWidth: '300px', marginTop: '1rem' }}
          >
            {language === 'en' ? 'Go to Dashboard' : 'Vai alla Dashboard'}
          </button>
        </div>
      ) : (
        /* ACTIVE CALENDAR & BOOKING SCREEN */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
              {language === 'en' ? 'Schedule a Lesson' : 'Prenota una Lezione'}
            </h2>
            <p style={{ color: 'var(--text-muted)' }}>
              {step === 1 
                ? (language === 'en' ? 'Choose date/time and fill information' : 'Scegli la data, l\'ora e compila le informazioni')
                : (language === 'en' ? 'Complete secure pre-payment via Stripe' : 'Completa il pagamento sicuro tramite Stripe')}
            </p>
          </div>

          {step === 1 ? (
            /* STEP 1: DATE & SLOT SELECTOR + FORM INFO */
            <form onSubmit={handleNextStep} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                
                {/* CALENDAR VIEW PANEL */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', textTransform: 'capitalize' }}>
                      {formatMonthName(currentMonth)}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="button" onClick={prevMonth} className="btn-secondary" style={{ padding: '4px 8px', borderRadius: '8px' }}>
                        <ChevronLeft size={18} />
                      </button>
                      <button type="button" onClick={nextMonth} className="btn-secondary" style={{ padding: '4px 8px', borderRadius: '8px' }}>
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Calendar Grid Header */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    color: 'var(--text-light)',
                    marginBottom: '0.8rem'
                  }}>
                    {language === 'en' 
                      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <span key={d}>{d}</span>)
                      : ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'].map(d => <span key={d}>{d}</span>)}
                  </div>

                  {/* Calendar Grid Days */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '4px'
                  }}>
                    {/* Blank offsets */}
                    {[...Array(firstDayIndex)].map((_, i) => <div key={`empty-${i}`} />)}
                    
                    {/* Month Days */}
                    {[...Array(daysInMonth)].map((_, i) => {
                      const dayNum = i + 1;
                      const cellDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum);
                      
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const isPast = cellDate < today;
                      
                      const isSelected = selectedDate && 
                        selectedDate.getDate() === dayNum && 
                        selectedDate.getMonth() === currentMonth.getMonth() &&
                        selectedDate.getFullYear() === currentMonth.getFullYear();

                      return (
                        <button
                          key={dayNum}
                          type="button"
                          onClick={() => handleDateClick(dayNum)}
                          disabled={isPast}
                          style={{
                            aspectRatio: '1',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: isSelected 
                              ? 'var(--text-inverse)' 
                              : isPast 
                                ? 'var(--text-light)' 
                                : 'var(--text-main)',
                            backgroundColor: isSelected 
                              ? 'var(--primary)' 
                              : isPast 
                                ? 'transparent' 
                                : 'var(--bg-input)',
                            border: isSelected ? 'none' : '1px solid var(--border)',
                            opacity: isPast ? 0.4 : 1,
                            cursor: isPast ? 'not-allowed' : 'pointer',
                            boxShadow: isSelected ? '0 4px 10px var(--primary-glow)' : 'none'
                          }}
                        >
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SLOT & DETAILS PANEL */}
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  
                  {/* Slots selector */}
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={16} />
                      {language === 'en' ? 'Available Slots' : 'Orari Disponibili'}
                    </h3>
                    
                    {!selectedDate ? (
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
                        {language === 'en' ? 'Please select a date on the calendar first.' : 'Per favore, seleziona prima una data sul calendario.'}
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {mockSlots.map(slot => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            style={{
                              padding: '0.6rem 1rem',
                              borderRadius: '10px',
                              border: selectedSlot === slot ? '2px solid var(--primary)' : '1px solid var(--border)',
                              backgroundColor: selectedSlot === slot ? 'var(--primary-glow)' : 'var(--bg-input)',
                              color: selectedSlot === slot ? 'var(--primary)' : 'var(--text-main)',
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              textAlign: 'left'
                            }}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Booking details form fields */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-light)' }} />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder={language === 'en' ? 'Your Name' : 'Il tuo nome'}
                        style={{
                          width: '100%',
                          padding: '0.6rem 1rem 0.6rem 2.2rem',
                          borderRadius: '10px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--bg-input)',
                          color: 'var(--text-main)'
                        }}
                      />
                    </div>

                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-light)' }} />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder={language === 'en' ? 'Email Address' : 'Indirizzo E-mail'}
                        style={{
                          width: '100%',
                          padding: '0.6rem 1rem 0.6rem 2.2rem',
                          borderRadius: '10px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--bg-input)',
                          color: 'var(--text-main)'
                        }}
                      />
                    </div>

                    <div>
                      <select
                        value={level}
                        onChange={e => setLevel(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.6rem 1rem',
                          borderRadius: '10px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--bg-input)',
                          color: 'var(--text-main)',
                          fontSize: '0.9rem'
                        }}
                      >
                        <option value="beginner">{language === 'en' ? 'Beginner (JLPT N5/N4)' : 'Principiante (JLPT N5/N4)'}</option>
                        <option value="intermediate">{language === 'en' ? 'Intermediate (JLPT N3)' : 'Intermedio (JLPT N3)'}</option>
                        <option value="fluent">{language === 'en' ? 'Conversational / Advanced' : 'Conversazione / Avanzato'}</option>
                      </select>
                    </div>

                    <div>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder={language === 'en' ? 'Special goals or study notes (optional)' : 'Obiettivi speciali o note di studio (opzionale)'}
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '0.6rem 1rem',
                          borderRadius: '10px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--bg-input)',
                          color: 'var(--text-main)',
                          fontSize: '0.9rem',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Booking Plan Selection */}
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CreditCard size={16} />
                  {language === 'en' ? 'Select Billing Model' : 'Seleziona il Modello di Fatturazione'}
                </h3>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                  
                  <label style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: paymentPlan === 'single' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    backgroundColor: paymentPlan === 'single' ? 'var(--primary-glow)' : 'var(--bg-input)',
                    cursor: 'pointer',
                    minWidth: '200px'
                  }}>
                    <input 
                      type="radio" 
                      name="plan" 
                      checked={paymentPlan === 'single'} 
                      onChange={() => setPaymentPlan('single')}
                      style={{ display: 'none' }}
                    />
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                      {language === 'en' ? 'Single Lesson' : 'Lezione Singola'}
                    </span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.3rem' }}>
                      CHF 35
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {language === 'en' ? 'Pay-as-you-go session' : 'Sessione singola prepagata'}
                    </span>
                  </label>

                  <label style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: paymentPlan === 'subscription' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    backgroundColor: paymentPlan === 'subscription' ? 'var(--primary-glow)' : 'var(--bg-input)',
                    cursor: 'pointer',
                    minWidth: '200px'
                  }}>
                    <input 
                      type="radio" 
                      name="plan" 
                      checked={paymentPlan === 'subscription'} 
                      onChange={() => setPaymentPlan('subscription')}
                      style={{ display: 'none' }}
                    />
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                      {language === 'en' ? 'Monthly Subscription' : 'Abbonamento Mensile'}
                    </span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.3rem' }}>
                      CHF 119 / mo
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {language === 'en' ? '4 lessons + premium perks' : '4 lezioni + vantaggi premium'}
                    </span>
                  </label>

                </div>
              </div>

              {/* Next CTA */}
              <button
                type="submit"
                disabled={!selectedDate || !selectedSlot || !name || !email}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                {language === 'en' ? 'Proceed to Payment' : 'Procedi al Pagamento'}
                <ArrowRight size={20} style={{ marginLeft: '4px' }} />
              </button>
            </form>
          ) : (
            /* STEP 2: STRIPE CREDIT CARD PAYMENT MOCK */
            <div className="glass-panel" style={{ padding: '2rem', maxWidth: '500px', margin: '0 auto', width: '100%' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontWeight: 600, fontSize: '1rem' }}>
                  {language === 'en' ? 'Secure Checkout' : 'Pagamento Sicuro'}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                  {paymentPlan === 'single' ? 'CHF 35' : 'CHF 119'}
                </span>
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: 'var(--primary-glow)',
                borderRadius: '12px',
                fontSize: '0.85rem',
                border: '1px solid var(--border-glow)',
                marginBottom: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem'
              }}>
                <div>📅 <strong>{selectedDate && formatFullDate(selectedDate)}</strong></div>
                <div>⏰ <strong>{selectedSlot}</strong></div>
                <div>👤 <strong>{name}</strong> ({email})</div>
              </div>

              <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                
                {/* Simulated Stripe Credit Card Inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    {language === 'en' ? 'Card Details (Stripe Simulation)' : 'Dettagli Carta (Simulatore Stripe)'}
                  </label>

                  <div style={{ position: 'relative' }}>
                    <CreditCard size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-light)' }} />
                    <input
                      type="text"
                      required
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                      style={{
                        width: '100%',
                        padding: '0.6rem 1rem 0.6rem 2.2rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-input)',
                        color: 'var(--text-main)',
                        fontSize: '1rem',
                        letterSpacing: '0.1em'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <input
                      type="text"
                      required
                      placeholder="MM / YY"
                      value={cardExpiry}
                      onChange={e => setCardExpiry(e.target.value.slice(0, 5))}
                      style={{
                        flex: 1,
                        padding: '0.6rem 1rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-input)',
                        color: 'var(--text-main)',
                        fontSize: '1rem',
                        textAlign: 'center'
                      }}
                    />
                    <input
                      type="text"
                      required
                      placeholder="CVC"
                      value={cardCvc}
                      onChange={e => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      style={{
                        flex: 1,
                        padding: '0.6rem 1rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-input)',
                        color: 'var(--text-main)',
                        fontSize: '1rem',
                        textAlign: 'center'
                      }}
                    />
                  </div>
                </div>

                {/* Back / Pay buttons */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={isProcessing}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    {language === 'en' ? 'Back' : 'Indietro'}
                  </button>

                  <button
                    type="submit"
                    disabled={isProcessing || !cardNumber || !cardExpiry || !cardCvc}
                    className="btn btn-accent"
                    style={{ flex: 2 }}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={18} className="animate-spin" style={{ marginRight: '6px' }} />
                        <span>{language === 'en' ? 'Paying...' : 'Pagamento...'}</span>
                      </>
                    ) : (
                      <span>{language === 'en' ? `Pay ${paymentPlan === 'single' ? 'CHF 35' : 'CHF 119'}` : `Paga ${paymentPlan === 'single' ? 'CHF 35' : 'CHF 119'}`}</span>
                    )}
                  </button>
                </div>
              </form>

              {/* Security info */}
              <div style={{
                textAlign: 'center',
                fontSize: '0.75rem',
                color: 'var(--text-light)',
                marginTop: '1.5rem'
              }}>
                🔒 {language === 'en' ? 'Encrypted Connection • Verified Stripe Provider' : 'Connessione Crittografata • Provider Stripe Verificato'}
              </div>

            </div>
          )}

        </div>
      )}

      {/* Spinner animation inline */}
      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
