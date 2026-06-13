import React, { useState, useEffect, useCallback } from 'react';
import { Video, Calendar, Sparkles, AlertCircle, Trash2, Crown, LogOut, User, Shield, Zap, CalendarClock, Ticket, Gift } from 'lucide-react';
import type { LunaUser } from '../types/user';
import { canManageUsers, hasActiveSubscription, isAdminRole, isTrialActive, roleLabel } from '../types/user';
import type { BookingMode } from './BookingCalendar';
import type { BookedLesson } from '../types/booking';
import { loadBookings } from '../services/bookingService';
import { loadPurchasedGiftCoupons, loadUserCoupons, redeemCouponCode } from '../services/couponService';
import { cancelBookingRemote, formatEmailCallableError } from '../services/emailService';
import type { PurchasedGiftCoupon, UserCouponSummary } from '../types/coupon';
import { PremiumUpgradeButton } from './PremiumUpgradeButton';
import { PremiumRetentionNotice } from './PremiumRetentionNotice';
import { formatStripeCallableError, openPremiumPortal, startGiftLessonCheckout } from '../services/stripeService';

interface StudentDashboardProps {
  language: 'en' | 'it';
  onNavigateToBooking: (mode: BookingMode, bookingId?: string) => void;
  currentUser: LunaUser;
  onLogout: () => void;
  onUserUpdate: (updates: Partial<LunaUser>) => Promise<void>;
  onBookingCancelled?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  language,
  onNavigateToBooking,
  currentUser,
  onLogout,
  onUserUpdate,
  onBookingCancelled,
}) => {
  const [bookings, setBookings] = useState<BookedLesson[]>([]);
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<BookedLesson | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [coupons, setCoupons] = useState<UserCouponSummary[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [giftCoupons, setGiftCoupons] = useState<PurchasedGiftCoupon[]>([]);
  const [giftLoading, setGiftLoading] = useState(false);
  const [giftError, setGiftError] = useState<string | null>(null);
  const [giftNotice, setGiftNotice] = useState<string | null>(null);
  const [copiedGiftId, setCopiedGiftId] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      const loaded = await loadBookings(currentUser.id);
      setBookings(loaded);
    } catch (err) {
      console.error('Failed to load bookings', err);
    } finally {
      setBookingsLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const fetchCoupons = useCallback(async () => {
    try {
      setCoupons(await loadUserCoupons(currentUser.id));
    } catch (err) {
      console.error('Failed to load coupons', err);
    }
  }, [currentUser.id]);

  useEffect(() => {
    void fetchCoupons();
  }, [fetchCoupons]);

  const fetchGiftCoupons = useCallback(async () => {
    try {
      setGiftCoupons(await loadPurchasedGiftCoupons(currentUser.id));
    } catch (err) {
      console.error('Failed to load gift coupons', err);
    }
  }, [currentUser.id]);

  useEffect(() => {
    void fetchGiftCoupons();
  }, [fetchGiftCoupons]);

  useEffect(() => {
    if (sessionStorage.getItem('luna_pending_gift_refresh') === '1') {
      setGiftNotice(
        language === 'en'
          ? 'Gift purchase complete. Check your email for the code, or copy it below.'
          : 'Acquisto regalo completato. Controlla l\'email con il codice, oppure copialo qui sotto.',
      );
      void fetchGiftCoupons();
    }
  }, [fetchGiftCoupons, language]);

  const handleBuyGiftCoupon = async () => {
    setGiftLoading(true);
    setGiftError(null);
    setGiftNotice(null);
    try {
      const url = await startGiftLessonCheckout(language);
      window.location.href = url;
    } catch (err) {
      setGiftError(formatStripeCallableError(err, language));
      setGiftLoading(false);
    }
  };

  const handleCopyGiftCode = async (coupon: PurchasedGiftCoupon) => {
    try {
      await navigator.clipboard.writeText(coupon.shareCode);
      setCopiedGiftId(coupon.couponId);
      window.setTimeout(() => setCopiedGiftId((id) => (id === coupon.couponId ? null : id)), 2000);
    } catch {
      setGiftError(
        language === 'en'
          ? 'Could not copy the code. Select it manually.'
          : 'Impossibile copiare il codice. Selezionalo manualmente.',
      );
    }
  };

  const handleRedeemCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      await redeemCouponCode(couponCode.trim());
      setCouponCode('');
      await fetchCoupons();
    } catch (err) {
      setCouponError(formatEmailCallableError(err, language));
    } finally {
      setCouponLoading(false);
    }
  };

  const confirmCancelBooking = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    setCancelError(null);
    try {
      const cancelled = cancelTarget;
      await cancelBookingRemote(cancelled.id);
      setBookings((prev) => prev.filter((b) => b.id !== cancelled.id));
      setCancelTarget(null);
      if (cancelled.slotType === 'intro' || cancelled.plan === 'trial_intro') {
        onBookingCancelled?.();
      }
    } catch (err) {
      setCancelError(formatEmailCallableError(err, language));
    } finally {
      setCancelLoading(false);
    }
  };

  const toggleTier = async () => {
    const newTier = currentUser.tier === 'free' ? 'premium' : 'free';
    await onUserUpdate({
      tier: newTier,
      messagesCount: newTier === 'premium' ? 0 : currentUser.messagesCount,
    });
    setShowUpgradeConfirm(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'it-IT', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const completedUnitsCount = currentUser.completedUnits.length;
  const xp = currentUser.xp || completedUnitsCount * 10;
  const isPremium = currentUser.tier === 'premium';
  const subscribed = hasActiveSubscription(currentUser);
  const trialActive = isTrialActive(currentUser);
  const canToggleTier = canManageUsers(currentUser.role);

  return (
    <div className="page-view" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ── User Profile Hero ── */}
      <div className="glass-panel" style={{
        padding: '1.5rem 2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        flexWrap: 'wrap',
        background: isPremium
          ? 'linear-gradient(135deg, rgba(155,89,182,0.08), rgba(155,89,182,0.02))'
          : 'var(--bg-panel)',
        borderColor: isPremium ? 'rgba(155,89,182,0.25)' : 'var(--border)'
      }}>
        {/* Avatar */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0,
          background: isPremium
            ? 'linear-gradient(135deg, var(--secondary), var(--primary))'
            : 'linear-gradient(135deg, var(--primary), var(--accent))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: '1.6rem', fontWeight: '700',
          boxShadow: isPremium ? '0 6px 20px rgba(155,89,182,0.3)' : '0 4px 15px var(--primary-glow)'
        }}>
          {isPremium ? <Crown size={28} /> : <User size={28} />}
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{currentUser.username}</h2>
            <span style={{
              fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
              backgroundColor: isPremium ? 'rgba(155,89,182,0.15)' : 'var(--primary-glow)',
              color: isPremium ? 'var(--secondary)' : 'var(--primary)',
              border: `1px solid ${isPremium ? 'rgba(155,89,182,0.3)' : 'var(--border-glow)'}`,
              display: 'flex', alignItems: 'center', gap: '0.3rem'
            }}>
              {isPremium ? <Crown size={11} /> : <Zap size={11} />}
              {isPremium ? 'PREMIUM' : 'FREE'}
            </span>
            {isAdminRole(currentUser.role) && (
              <span style={{
                fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                backgroundColor: 'rgba(231, 76, 60, 0.12)',
                color: 'var(--primary)',
                display: 'flex', alignItems: 'center', gap: '0.3rem'
              }}>
                <Shield size={11} />
                {roleLabel(currentUser.role, language)}
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            {currentUser.email}
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
            {language === 'en' ? `Member since ${currentUser.joinedDate || 'today'}` : `Membro dal ${currentUser.joinedDate || 'oggi'}`}
          </p>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
        >
          <LogOut size={16} />
          {language === 'en' ? 'Log Out' : 'Esci'}
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            {language === 'en' ? 'Plan' : 'Piano'}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: isPremium ? 'var(--secondary)' : 'var(--primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.3rem' }}>
            {isPremium ? <Crown size={20} /> : <Zap size={20} />}
            {isPremium ? 'Premium' : 'Free'}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            {language === 'en' ? 'Lessons Done' : 'Lezioni Completate'}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {completedUnitsCount}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            XP
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
            <Sparkles size={18} /> {xp}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            {language === 'en' ? 'Booked Lessons' : 'Lezioni Prenotate'}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {bookings.length}
          </div>
        </div>
      </div>

      {/* ── Subscription Management ── */}
      <div className="glass-panel" style={{
        padding: '1.5rem',
        background: isPremium
          ? 'linear-gradient(135deg, rgba(155,89,182,0.07), rgba(155,89,182,0.02))'
          : 'var(--primary-glow)',
        borderColor: isPremium ? 'rgba(155,89,182,0.2)' : 'var(--border-glow)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem' }}>
          <Shield size={20} style={{ color: isPremium ? 'var(--secondary)' : 'var(--primary)' }} />
          <h3 style={{ margin: 0 }}>
            {language === 'en' ? 'Subscription Management' : 'Gestione Abbonamento'}
          </h3>
        </div>

        {isPremium ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--secondary)', marginBottom: '0.3rem' }}>
                👑 {language === 'en' ? 'You have Premium access!' : 'Hai accesso Premium!'}
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {language === 'en'
                  ? 'Unlimited AI chat • Full tutor memory • Priority booking'
                  : 'Chat AI illimitata • Memoria tutor completa • Prenotazioni prioritarie'}
              </p>
            </div>
            <button
              onClick={() => void openPremiumPortal().then((url) => { window.location.href = url; }).catch(console.error)}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem' }}
            >
              {language === 'en' ? 'Manage subscription' : 'Gestisci abbonamento'}
            </button>
            {canToggleTier && (
            <button
              onClick={() => setShowUpgradeConfirm(true)}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem' }}
            >
              {language === 'en' ? 'Admin: Downgrade' : 'Admin: Torna Free'}
            </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ fontWeight: 600, marginBottom: '0.3rem' }}>
                {language === 'en' ? 'Upgrade to Premium' : 'Passa a Premium'}
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {language === 'en'
                  ? 'Get unlimited AI tutor chats, long-term memory, and priority booking.'
                  : 'Chat AI illimitata, memoria a lungo termine e prenotazione prioritaria.'}
              </p>
            </div>
            <PremiumUpgradeButton language={language} />
          </div>
        )}
      </div>

      <PremiumRetentionNotice language={language} currentUser={currentUser} />

      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Ticket size={18} />
          {language === 'en' ? 'Coupons & credits' : 'Coupon e crediti'}
        </h3>
        <form onSubmit={(e) => void handleRedeemCoupon(e)} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder={language === 'en' ? 'Enter coupon code' : 'Inserisci codice coupon'}
            style={{ flex: '1 1 200px', padding: '0.6rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border)' }}
          />
          <button type="submit" className="btn btn-secondary" disabled={couponLoading}>
            {couponLoading
              ? (language === 'en' ? 'Redeeming…' : 'Riscatto…')
              : (language === 'en' ? 'Redeem' : 'Riscatta')}
          </button>
        </form>
        {couponError && <p style={{ margin: 0, color: 'var(--error)', fontSize: '0.85rem' }}>{couponError}</p>}
        {coupons.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {language === 'en' ? 'No active coupons.' : 'Nessun coupon attivo.'}
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {coupons.map((coupon) => (
              <li key={coupon.couponId}>
                {coupon.type === 'free_lesson'
                  ? (language === 'en' ? 'Free lesson' : 'Lezione gratuita')
                  : (language === 'en'
                    ? `${coupon.percentOff ?? 20}% off extra lesson`
                    : `${coupon.percentOff ?? 20}% sconto lezione extra`)}
                {' — '}
                {language === 'en' ? 'expires' : 'scade'}{' '}
                {new Date(coupon.expiresAt).toLocaleDateString(language === 'en' ? 'en-US' : 'it-IT')}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Gift size={18} />
          {language === 'en' ? 'Gift a lesson' : 'Regala una lezione'}
        </h3>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          {language === 'en'
            ? 'Buy a gift coupon for one 60-minute live lesson with Luna. Share the code — the recipient can redeem and book without an active subscription.'
            : 'Acquista un coupon regalo per una lezione live da 60 minuti con Luna. Condividi il codice: chi lo riceve può riscattarlo e prenotare anche senza abbonamento attivo.'}
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void handleBuyGiftCoupon()}
          disabled={giftLoading}
          style={{ alignSelf: 'flex-start' }}
        >
          {giftLoading
            ? (language === 'en' ? 'Opening checkout…' : 'Apertura checkout…')
            : (language === 'en' ? 'Buy gift coupon (49 EUR/CHF)' : 'Acquista coupon regalo (49 EUR/CHF)')}
        </button>
        {giftNotice && (
          <p style={{ margin: 0, color: 'var(--success, #2e7d32)', fontSize: '0.85rem' }}>{giftNotice}</p>
        )}
        {giftError && <p style={{ margin: 0, color: 'var(--error)', fontSize: '0.85rem' }}>{giftError}</p>}
        {giftCoupons.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {giftCoupons.map((coupon) => (
              <li
                key={coupon.couponId}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.75rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  fontSize: '0.88rem',
                }}
              >
                <div>
                  <strong style={{ fontFamily: 'monospace' }}>{coupon.shareCode}</strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                    {coupon.status === 'issued'
                      ? (language === 'en' ? 'Not redeemed yet' : 'Non ancora riscattato')
                      : coupon.status === 'redeemed'
                        ? (language === 'en' ? 'Redeemed' : 'Riscattato')
                        : coupon.status === 'used'
                          ? (language === 'en' ? 'Lesson booked' : 'Lezione prenotata')
                          : coupon.status}
                  </span>
                </div>
                {coupon.status === 'issued' && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    onClick={() => void handleCopyGiftCode(coupon)}
                  >
                    {copiedGiftId === coupon.couponId
                      ? (language === 'en' ? 'Copied!' : 'Copiato!')
                      : (language === 'en' ? 'Copy code' : 'Copia codice')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Private Lessons Section ── */}
      <div>
        <h3 style={{ fontSize: '1.4rem', marginBottom: '1.2rem' }}>
          {language === 'en' ? 'Upcoming Private Lessons' : 'Lezioni Private in Arrivo'}
        </h3>

        {bookingsLoading ? (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            {language === 'en' ? 'Loading bookings...' : 'Caricamento prenotazioni...'}
          </div>
        ) : bookings.length === 0 ? (
          <div className="glass-panel" style={{
            padding: '3rem 2rem', textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'
          }}>
            <Calendar size={48} style={{ color: 'var(--text-light)' }} />
            <h4 style={{ fontSize: '1.2rem' }}>
              {language === 'en' ? 'No lessons scheduled yet' : 'Nessuna lezione programmata'}
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px' }}>
              {subscribed
                ? language === 'en'
                  ? 'Book a 1-on-1 private lesson with Luna and get your Google Meet link instantly.'
                  : 'Prenota una lezione privata con Luna e ottieni subito il link Google Meet.'
                : trialActive
                  ? language === 'en'
                    ? 'Your trial includes a 30-minute intro videocall with Luna.'
                    : 'La prova gratuita include una videocall introduttiva di 30 minuti con Luna.'
                  : language === 'en'
                    ? 'Subscribe with Stripe to book live lessons with Luna (2 included per billing cycle).'
                    : 'Abbonati con Stripe per prenotare lezioni live con Luna (2 incluse per ciclo).'}
            </p>
            {subscribed ? (
              <button
                type="button"
                onClick={() => onNavigateToBooking('regular')}
                className="btn btn-primary"
                style={{ marginTop: '1rem' }}
              >
                {language === 'en' ? 'Book a Lesson' : 'Prenota una Lezione'}
              </button>
            ) : trialActive ? (
              <button
                type="button"
                onClick={() => onNavigateToBooking('intro')}
                className="btn btn-primary"
                style={{ marginTop: '1rem' }}
              >
                {language === 'en' ? 'Book intro call' : 'Prenota call introduttiva'}
              </button>
            ) : (
              <div style={{ marginTop: '1rem' }}>
                <PremiumUpgradeButton
                  language={language}
                  label={language === 'en' ? 'Subscribe with Stripe' : 'Abbonati con Stripe'}
                />
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {bookings.map((booking) => (
              <div key={booking.id} className="glass-panel" style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                padding: '1.2rem', gap: '1.5rem',
                borderLeft: '5px solid var(--success)', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)',
                    backgroundColor: 'var(--success-glow)', padding: '2px 8px', borderRadius: '6px', width: 'fit-content'
                  }}>
                    🛡️ {language === 'en' ? 'PAID / CONFIRMED' : 'PAGATO / CONFERMATO'}
                  </span>
                  <h4 style={{ fontSize: '1.15rem', color: 'var(--text-main)' }}>📅 {formatDate(booking.date)}</h4>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                    <span>⏰ {booking.time}</span>
                    <span>💳 {booking.price}</span>
                  </div>
                  {booking.notes && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontStyle: 'italic', marginTop: '0.2rem' }}>
                      📝 "{booking.notes}"
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <a href={booking.meetLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{
                    background: 'linear-gradient(135deg, #4285F4, #34A853)', color: 'white',
                    boxShadow: '0 4px 10px rgba(66,133,244,0.25)', padding: '0.6rem 1.2rem', fontSize: '0.9rem', borderRadius: '12px'
                  }}>
                    <Video size={16} />
                    <span>{language === 'en' ? 'Join Meet' : 'Entra nel Meet'}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => onNavigateToBooking(booking.slotType === 'intro' ? 'intro' : 'regular', booking.id)}
                    className="btn btn-secondary"
                    style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}
                    title={language === 'en' ? 'Reschedule' : 'Riprogramma'}
                  >
                    <CalendarClock size={16} />
                    {language === 'en' ? 'Reschedule' : 'Riprogramma'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCancelTarget(booking); setCancelError(null); }}
                    style={{ padding: '0.6rem', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--text-light)', transition: 'all var(--transition-fast)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--error)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-light)'; }}
                    title={language === 'en' ? 'Cancel' : 'Annulla'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Info Notice ── */}
      <div className="glass-panel" style={{
        padding: '1.2rem', display: 'flex', gap: '0.8rem', alignItems: 'flex-start',
        backgroundColor: 'var(--primary-glow)', border: '1px solid var(--border-glow)'
      }}>
        <AlertCircle size={20} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          <strong>{language === 'en' ? 'Reschedule or cancel' : 'Riprogramma o annulla'}</strong><br />
          {language === 'en'
            ? 'You can cancel once per billing cycle without losing your included or extra lesson (rebook at no extra charge). A second cancellation forfeits the lesson. Changes require 24h notice.'
            : 'Puoi annullare una volta per ciclo senza perdere la lezione inclusa o extra (riprenotazione gratuita). Una seconda cancellazione fa perdere la lezione. Serve preavviso di 24 ore.'}
        </div>
      </div>

      {cancelTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div className="glass-panel" style={{
            maxWidth: '420px', width: '100%', padding: '2rem',
            background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', gap: '1rem',
          }}>
            <h3 style={{ margin: 0 }}>
              {language === 'en' ? 'Cancel this lesson?' : 'Annullare questa lezione?'}
            </h3>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
              {formatDate(cancelTarget.date)} · {cancelTarget.time}
            </p>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>
              {language === 'en'
                ? 'Only possible at least 24 hours before the session.'
                : 'Possibile solo almeno 24 ore prima della lezione.'}
            </p>
            {cancelError && <p style={{ color: 'var(--error)', margin: 0, fontSize: '0.85rem' }}>{cancelError}</p>}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setCancelTarget(null)} disabled={cancelLoading}>
                {language === 'en' ? 'Keep' : 'Mantieni'}
              </button>
              <button type="button" className="btn btn-primary" style={{ flex: 1, background: 'var(--error)' }} onClick={() => void confirmCancelBooking()} disabled={cancelLoading}>
                {cancelLoading ? (language === 'en' ? 'Cancelling…' : 'Annullamento…') : (language === 'en' ? 'Cancel lesson' : 'Annulla lezione')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upgrade/Downgrade Confirm Modal ── */}
      {showUpgradeConfirm && canToggleTier && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '380px', width: '100%', padding: '2rem', textAlign: 'center',
            background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', gap: '1.2rem'
          }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', margin: '0 auto'
            }}>
              <Crown size={28} />
            </div>
            <h3 style={{ margin: 0 }}>
              {isPremium
                ? (language === 'en' ? 'Downgrade to Free?' : 'Tornare al piano Free?')
                : (language === 'en' ? 'Upgrade to Premium?' : 'Passare a Premium?')}
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
              {isPremium
                ? (language === 'en'
                  ? 'You will lose unlimited AI chat and long-term memory access.'
                  : 'Perderai accesso illimitato alla chat AI e alla memoria a lungo termine.')
                : (language === 'en'
                  ? 'Unlock unlimited AI conversations, full tutor memory, and more!'
                  : 'Sblocca chat AI illimitata, memoria completa del tutor e molto altro!')}
            </p>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowUpgradeConfirm(false)}>
                {language === 'en' ? 'Cancel' : 'Annulla'}
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={toggleTier}>
                {isPremium
                  ? (language === 'en' ? 'Yes, Downgrade' : 'Sì, Declassa')
                  : (language === 'en' ? 'Yes, Upgrade!' : 'Sì, Upgrade!')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
