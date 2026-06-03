import React, { useState, useEffect, useCallback } from 'react';
import { Video, Calendar, Sparkles, AlertCircle, Trash2, Crown, LogOut, User, Shield, Zap } from 'lucide-react';
import type { LunaUser } from '../types/user';
import { canManageUsers, isAdminRole, roleLabel } from '../types/user';
import type { BookedLesson } from '../types/booking';
import { loadBookings, deleteBooking as deleteBookingFromDb } from '../services/bookingService';

interface StudentDashboardProps {
  language: 'en' | 'it';
  onNavigateToBooking: () => void;
  currentUser: LunaUser;
  onLogout: () => void;
  onUserUpdate: (updates: Partial<LunaUser>) => Promise<void>;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  language,
  onNavigateToBooking,
  currentUser,
  onLogout,
  onUserUpdate,
}) => {
  const [bookings, setBookings] = useState<BookedLesson[]>([]);
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(true);

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

  const deleteBooking = async (id: string) => {
    try {
      await deleteBookingFromDb(currentUser.id, id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error('Failed to delete booking', err);
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
  const canToggleTier = canManageUsers(currentUser.role);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

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
              onClick={() => canToggleTier && setShowUpgradeConfirm(true)}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', visibility: canToggleTier ? 'visible' : 'hidden' }}
            >
              {language === 'en' ? 'Downgrade to Free' : 'Torna al Piano Free'}
            </button>
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
            {canToggleTier ? (
              <button
                onClick={() => setShowUpgradeConfirm(true)}
                className="btn btn-primary"
                style={{ display: 'flex', gap: '0.5rem' }}
              >
                <Crown size={16} />
                {language === 'en' ? 'Upgrade Now' : 'Passa a Premium'}
              </button>
            ) : (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {language === 'en' ? 'Payments coming soon' : 'Pagamenti in arrivo'}
              </span>
            )}
          </div>
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
              {language === 'en'
                ? 'Book a 1-on-1 private lesson with Luna and get your Google Meet link instantly.'
                : "Prenota una lezione privata con Luna e ottieni subito il link Google Meet."}
            </p>
            <button onClick={onNavigateToBooking} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              {language === 'en' ? 'Book a Lesson' : 'Prenota una Lezione'}
            </button>
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
                  <button onClick={() => deleteBooking(booking.id)}
                    style={{ padding: '0.6rem', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--text-light)', transition: 'all var(--transition-fast)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--error)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-light)'}
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
          <strong>{language === 'en' ? 'Need to reschedule?' : 'Hai bisogno di riprogrammare?'}</strong><br />
          {language === 'en'
            ? 'Lessons can be rescheduled or cancelled up to 24 hours before the session. Contact Luna via WhatsApp for priority booking.'
            : "Le lezioni possono essere riprogrammate fino a 24 ore prima. Contatta Luna via WhatsApp per prenotazioni prioritarie."}
        </div>
      </div>

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
