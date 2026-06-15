import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Euro, Loader2 } from 'lucide-react';
import type { LunaUser } from '../types/user';
import { isTeacherRole, isSuperAdminRole } from '../types/user';
import { getTeacherPublicName, TEACHER_LESSON_PAYOUT_EUR } from '../types/teacher';
import {
  countCompletedRegularLessons,
  earningsByMonth,
  loadTeacherBookings,
  loadTeacherPayoutMonths,
  payoutAmount,
  setTeacherPayoutStatusRemote,
} from '../services/teacherService';
import { listAllUsers } from '../services/userService';

interface TeacherPaymentsPanelProps {
  language: 'en' | 'it';
}

export const TeacherPaymentsPanel: React.FC<TeacherPaymentsPanelProps> = ({ language }) => {
  const [teachers, setTeachers] = useState<LunaUser[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyMonth, setBusyMonth] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Awaited<ReturnType<typeof loadTeacherBookings>>>([]);
  const [payouts, setPayouts] = useState<Awaited<ReturnType<typeof loadTeacherPayoutMonths>>>([]);
  const [now, setNow] = useState(0);

  useEffect(() => {
    void listAllUsers().then((users) => {
      const staff = users.filter((u) => isTeacherRole(u.role) || isSuperAdminRole(u.role));
      setTeachers(staff);
      if (staff.length > 0) setSelectedId(staff[0].id);
      setLoading(false);
    });
  }, []);

  const loadTeacherData = useCallback(async (teacherId: string) => {
    if (!teacherId) return;
    setLoading(true);
    try {
      const [b, p] = await Promise.all([
        loadTeacherBookings(teacherId),
        loadTeacherPayoutMonths(teacherId),
      ]);
      setBookings(b);
      setPayouts(p);
    } finally {
      setNow(Date.now());
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) void loadTeacherData(selectedId);
  }, [selectedId, loadTeacherData]);

  const monthCounts = useMemo(() => earningsByMonth(bookings, now), [bookings, now]);
  const completedRegular = countCompletedRegularLessons(bookings, now);
  const selectedTeacher = teachers.find((t) => t.id === selectedId);

  const handleStatus = async (monthKey: string, status: 'pending_invoice' | 'paid' | '') => {
    if (!selectedId || !status) return;
    setBusyMonth(monthKey);
    try {
      const count = monthCounts.get(monthKey) ?? 0;
      await setTeacherPayoutStatusRemote(selectedId, monthKey, status, count);
      await loadTeacherData(selectedId);
    } finally {
      setBusyMonth(null);
    }
  };

  if (loading && teachers.length === 0) {
    return <Loader2 size={24} className="spin" />;
  }

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Euro size={20} style={{ color: 'var(--primary)' }} />
        <h3 style={{ margin: 0 }}>{language === 'en' ? 'Teacher payments' : 'Pagamenti maestri'}</h3>
      </div>

      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
        {language === 'en' ? 'Teacher' : 'Maestro/a'}
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ display: 'block', marginTop: 4, padding: '0.5rem', borderRadius: 8, width: '100%', maxWidth: 360 }}
        >
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{getTeacherPublicName(t)} ({t.email})</option>
          ))}
        </select>
      </label>

      {selectedTeacher && (
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {language === 'en' ? 'Completed regular lessons' : 'Lezioni regolari completate'}: {completedRegular} · {payoutAmount(completedRegular)} € ({TEACHER_LESSON_PAYOUT_EUR} €/{language === 'en' ? 'lesson' : 'lezione'})
        </p>
      )}

      {loading ? (
        <Loader2 size={24} className="spin" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[...monthCounts.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([monthKey, count]) => {
            const payout = payouts.find((p) => p.id === monthKey);
            return (
              <div key={monthKey} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 10 }}>
                <strong style={{ minWidth: 80 }}>{monthKey}</strong>
                <span>{count} {language === 'en' ? 'lessons' : 'lezioni'}</span>
                <span>{payoutAmount(count)} €</span>
                <select
                  value={payout?.status ?? ''}
                  disabled={busyMonth === monthKey}
                  onChange={(e) => void handleStatus(monthKey, e.target.value as 'pending_invoice' | 'paid' | '')}
                  style={{ padding: '0.35rem 0.5rem', borderRadius: 8 }}
                >
                  <option value="">—</option>
                  <option value="pending_invoice">{language === 'en' ? 'Awaiting invoice' : 'In attesa fattura'}</option>
                  <option value="paid">{language === 'en' ? 'Paid' : 'Pagato'}</option>
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
