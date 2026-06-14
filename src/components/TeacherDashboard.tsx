import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Euro,
  ExternalLink,
  Link2,
  Loader2,
  Save,
  User,
  Video,
} from 'lucide-react';
import type { LunaUser } from '../types/user';
import { getTeacherPublicName, TEACHER_LESSON_PAYOUT_EUR } from '../types/teacher';
import type { TeacherBookingView, TeacherPayoutMonth } from '../types/teacher';
import { hasMeetLink } from '../types/booking';
import { updateTeacherDisplayName } from '../services/userService';
import {
  countCompletedRegularLessons,
  earningsByMonth,
  isUpcomingBooking,
  loadTeacherBookings,
  loadTeacherPayoutMonths,
  payoutAmount,
  planLabel,
  setBookingMeetLinkRemote,
} from '../services/teacherService';
import { AdminAvailabilityPanel } from './AdminAvailabilityPanel';
import { useAuth } from '../contexts/AuthContext';

interface TeacherDashboardProps {
  language: 'en' | 'it';
  currentUser: LunaUser;
}

const PENDING_INVOICE_MSG = {
  it: 'Invia la fattura a luna@brignole.ch ed effettueremo il bonifico al più presto.',
  en: 'Send your invoice to luna@brignole.ch and we will transfer payment as soon as possible.',
};

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ language, currentUser }) => {
  const { refreshUser } = useAuth();
  const [bookings, setBookings] = useState<TeacherBookingView[]>([]);
  const [payouts, setPayouts] = useState<TeacherPayoutMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<'lessons' | 'availability' | 'earnings' | 'profile'>('lessons');
  const [linkDrafts, setLinkDrafts] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(currentUser.teacherDisplayName ?? '');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, p] = await Promise.all([
        loadTeacherBookings(currentUser.id),
        loadTeacherPayoutMonths(currentUser.id),
      ]);
      setBookings(b);
      setPayouts(p);
    } catch {
      setError(language === 'en' ? 'Could not load dashboard.' : 'Impossibile caricare la dashboard.');
    } finally {
      setLoading(false);
    }
  }, [currentUser.id, language]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const now = Date.now();
  const upcoming = useMemo(
    () => bookings.filter((b) => isUpcomingBooking(b, now)).sort((a, b) =>
      String(a.slotStartAt).localeCompare(String(b.slotStartAt)),
    ),
    [bookings, now],
  );
  const completed = useMemo(
    () => bookings.filter((b) => !isUpcomingBooking(b, now)),
    [bookings, now],
  );
  const completedRegular = countCompletedRegularLessons(bookings, now);
  const totalEarnings = payoutAmount(completedRegular);
  const monthCounts = earningsByMonth(bookings, now);

  const handleSaveLink = async (booking: TeacherBookingView) => {
    const key = `${booking.studentUid}:${booking.id}`;
    const url = (linkDrafts[key] ?? booking.meetLink ?? '').trim();
    if (!url) return;
    setBusyKey(key);
    try {
      await setBookingMeetLinkRemote(booking.studentUid, booking.id, url);
      await refresh();
    } catch {
      setError(language === 'en' ? 'Could not save link.' : 'Impossibile salvare il link.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleSaveDisplayName = async () => {
    setBusyKey('profile');
    try {
      await updateTeacherDisplayName(currentUser.id, displayName);
      await refreshUser();
    } finally {
      setBusyKey(null);
    }
  };

  const payoutForMonth = (monthKey: string) => payouts.find((p) => p.id === monthKey);

  return (
    <div className="page-view" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="glass-panel" style={{ padding: '1.5rem 2rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
          {language === 'en' ? 'Teacher dashboard' : 'Dashboard maestro/a'}
        </h2>
        <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {language === 'en'
            ? `Signed in as ${getTeacherPublicName(currentUser)}`
            : `Accesso come ${getTeacherPublicName(currentUser)}`}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {([
          ['lessons', language === 'en' ? 'Lessons' : 'Lezioni', Video],
          ['availability', language === 'en' ? 'Availability' : 'Disponibilità', Calendar],
          ['earnings', language === 'en' ? 'Earnings' : 'Compensi', Euro],
          ['profile', language === 'en' ? 'Profile' : 'Profilo', User],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            className={section === id ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setSection(id)}
          >
            <Icon size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '1rem', color: 'var(--error)' }}>{error}</div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          <Loader2 size={28} className="spin" />
        </div>
      ) : section === 'availability' ? (
        <AdminAvailabilityPanel language={language} currentUser={currentUser} />
      ) : section === 'profile' ? (
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 480 }}>
          <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            {language === 'en' ? 'Public display name' : 'Nome pubblico'}
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={currentUser.username}
            style={{ padding: '0.65rem 0.85rem', borderRadius: 10, border: '1px solid var(--border)' }}
          />
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {language === 'en'
              ? `Students will see: ${displayName.trim() || currentUser.username}`
              : `Gli studenti ti vedranno come: ${displayName.trim() || currentUser.username}`}
          </p>
          <button type="button" className="btn btn-primary" disabled={busyKey === 'profile'} onClick={() => void handleSaveDisplayName()}>
            <Save size={16} /> {language === 'en' ? 'Save' : 'Salva'}
          </button>
        </div>
      ) : section === 'earnings' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              {language === 'en' ? 'Total completed (regular)' : 'Totale completate (regolari)'}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>
              {totalEarnings} €
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {completedRegular} × {TEACHER_LESSON_PAYOUT_EUR} €
            </div>
          </div>
          {[...monthCounts.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([monthKey, count]) => {
            const payout = payoutForMonth(monthKey);
            return (
              <div key={monthKey} className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <strong>{monthKey}</strong>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {count} {language === 'en' ? 'lessons' : 'lezioni'} · {payoutAmount(count)} €
                  </div>
                </div>
                <span style={{
                  fontSize: '0.78rem', fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                  background: payout?.status === 'paid' ? 'var(--success-glow)' : payout?.status === 'pending_invoice' ? 'var(--warning)' : 'var(--primary-glow)',
                  color: payout?.status === 'paid' ? 'var(--success)' : 'var(--text-main)',
                }}>
                  {payout?.status === 'paid'
                    ? (language === 'en' ? 'Paid' : 'Pagato')
                    : payout?.status === 'pending_invoice'
                      ? (language === 'en' ? 'Awaiting invoice' : 'In attesa fattura')
                      : '—'}
                </span>
              </div>
            );
          })}
          {payouts.some((p) => p.status === 'pending_invoice') && (
            <div className="glass-panel" style={{ padding: '1rem', fontSize: '0.9rem', borderLeft: '4px solid var(--warning)' }}>
              {PENDING_INVOICE_MSG[language]}
            </div>
          )}
        </div>
      ) : (
        <>
          <h3 style={{ margin: 0 }}>{language === 'en' ? 'Upcoming lessons' : 'Lezioni in programma'}</h3>
          {upcoming.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>{language === 'en' ? 'No upcoming lessons.' : 'Nessuna lezione in programma.'}</p>
          ) : (
            upcoming.map((booking) => {
              const key = `${booking.studentUid}:${booking.id}`;
              const hasLink = hasMeetLink(booking);
              return (
                <div key={key} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <strong>{booking.name}</strong>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{booking.email}</div>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{planLabel(booking.plan, language)}</span>
                  </div>
                  <div><strong>{booking.date}</strong> · {booking.time}</div>
                  {hasLink ? (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <a href={booking.meetLink!} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
                        <ExternalLink size={16} /> {language === 'en' ? 'Open call' : 'Apri call'}
                      </a>
                      <input
                        type="url"
                        placeholder="https://meet.google.com/..."
                        value={linkDrafts[key] ?? booking.meetLink ?? ''}
                        onChange={(e) => setLinkDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                        style={{ flex: 1, minWidth: 200, padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={busyKey === key}
                        onClick={() => void handleSaveLink(booking)}
                      >
                        {busyKey === key ? '...' : (language === 'en' ? 'Update link' : 'Aggiorna link')}
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <Link2 size={16} style={{ color: 'var(--warning)' }} />
                      <input
                        type="url"
                        placeholder="https://meet.google.com/..."
                        value={linkDrafts[key] ?? ''}
                        onChange={(e) => setLinkDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                        style={{ flex: 1, minWidth: 200, padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={busyKey === key}
                        onClick={() => void handleSaveLink(booking)}
                      >
                        {busyKey === key ? '...' : (language === 'en' ? 'Save link' : 'Salva link')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
          {completed.length > 0 && (
            <>
              <h3 style={{ margin: '1rem 0 0' }}>{language === 'en' ? 'Past lessons' : 'Lezioni passate'}</h3>
              {completed.slice(0, 20).map((booking) => (
                <div key={`${booking.studentUid}:${booking.id}`} className="glass-panel" style={{ padding: '1rem', opacity: 0.85 }}>
                  <strong>{booking.name}</strong> · {booking.date} · {booking.time}
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
};
