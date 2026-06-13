import React, { useCallback, useEffect, useState } from 'react';
import { CalendarPlus, Loader2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import type { SlotType } from '../types/availability';
import { INTRO_SLOT_DURATION_MINUTES, defaultMaxParticipants } from '../types/availability';
import {
  createAvailabilitySlot,
  deleteAvailabilitySlot,
  loadAllAvailabilitySlotsAdmin,
  toggleAvailabilitySlot,
} from '../services/availabilityService';
import { adminDeactivateSlotRemote } from '../services/adminBookingService';

interface AdminAvailabilityPanelProps {
  language: 'en' | 'it';
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (h ?? 0) * 60 + (m ?? 0) + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

export const AdminAvailabilityPanel: React.FC<AdminAvailabilityPanelProps> = ({ language }) => {
  const [slots, setSlots] = useState<Awaited<ReturnType<typeof loadAllAvailabilitySlotsAdmin>>>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [slotType, setSlotType] = useState<SlotType>('intro');
  const [notes, setNotes] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSlots(await loadAllAvailabilitySlotsAdmin());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;
    setBusyId('create');
    try {
      const duration = slotType === 'intro' ? INTRO_SLOT_DURATION_MINUTES : 60;
      await createAvailabilitySlot({
        date,
        startTime,
        endTime: addMinutesToTime(startTime, duration),
        slotType,
        maxParticipants: defaultMaxParticipants(slotType),
        active: true,
        notes,
      });
      setNotes('');
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CalendarPlus size={18} />
          {language === 'en' ? 'Luna availability (in-app calendar)' : 'Disponibilità Luna (calendario interno)'}
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          {language === 'en'
            ? 'Intro slots (30 min, up to 5 students) are shown separately from regular 1-on-1 lessons.'
            : 'Gli slot intro (30 min, fino a 5 studenti) sono separati dalle lezioni individuali.'}
        </p>
      </div>

      <form onSubmit={(e) => void handleCreate(e)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
          {language === 'en' ? 'Date' : 'Data'}
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
          {language === 'en' ? 'Start time' : 'Ora inizio'}
          <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
          {language === 'en' ? 'Type' : 'Tipo'}
          <select value={slotType} onChange={(e) => setSlotType(e.target.value as SlotType)}>
            <option value="intro">{language === 'en' ? 'Intro videocall' : 'Videocall intro'}</option>
            <option value="regular">{language === 'en' ? 'Regular lesson' : 'Lezione regolare'}</option>
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
          {language === 'en' ? 'Notes' : 'Note'}
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </label>
        <button type="submit" className="btn btn-primary" disabled={busyId === 'create'}>
          {busyId === 'create' ? <Loader2 size={16} className="spin" /> : null}
          {language === 'en' ? 'Add slot' : 'Aggiungi slot'}
        </button>
      </form>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
          <Loader2 size={16} className="spin" />
          {language === 'en' ? 'Loading slots…' : 'Caricamento slot…'}
        </div>
      ) : slots.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>
          {language === 'en' ? 'No slots yet. Add intro and regular availability above.' : 'Nessuno slot. Aggiungi disponibilità intro e lezioni sopra.'}
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.5rem' }}>{language === 'en' ? 'Date' : 'Data'}</th>
                <th style={{ padding: '0.5rem' }}>{language === 'en' ? 'Time' : 'Orario'}</th>
                <th style={{ padding: '0.5rem' }}>{language === 'en' ? 'Type' : 'Tipo'}</th>
                <th style={{ padding: '0.5rem' }}>{language === 'en' ? 'Seats' : 'Posti'}</th>
                <th style={{ padding: '0.5rem' }}>{language === 'en' ? 'Actions' : 'Azioni'}</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot.id} style={{ borderBottom: '1px solid var(--border)', opacity: slot.active ? 1 : 0.5 }}>
                  <td style={{ padding: '0.5rem' }}>{slot.date}</td>
                  <td style={{ padding: '0.5rem' }}>{slot.startTime} – {slot.endTime}</td>
                  <td style={{ padding: '0.5rem' }}>{slot.slotType === 'intro' ? 'Intro' : 'Regular'}</td>
                  <td style={{ padding: '0.5rem' }}>{slot.participantCount}/{slot.maxParticipants}</td>
                  <td style={{ padding: '0.5rem', display: 'flex', gap: '0.35rem' }}>
                    {slot.participantCount > 0 && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={busyId === slot.id}
                        title={language === 'en' ? 'Cancel all bookings + compensate' : 'Annulla prenotazioni + compensa'}
                        onClick={() => {
                          const msg = language === 'en'
                            ? 'Cancel all bookings on this slot, email students, and issue compensation coupons?'
                            : 'Annullare tutte le prenotazioni su questo slot, avvisare gli studenti e emettere coupon di compensazione?';
                          if (!window.confirm(msg)) return;
                          setBusyId(slot.id);
                          void adminDeactivateSlotRemote({ slotId: slot.id })
                            .then(refresh)
                            .finally(() => setBusyId(null));
                        }}
                      >
                        {language === 'en' ? 'Cancel all' : 'Annulla tutti'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={busyId === slot.id}
                      onClick={() => {
                        setBusyId(slot.id);
                        void toggleAvailabilitySlot(slot.id, !slot.active).then(refresh).finally(() => setBusyId(null));
                      }}
                    >
                      {slot.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={busyId === slot.id || slot.participantCount > 0}
                      onClick={() => {
                        if (!window.confirm(language === 'en' ? 'Delete this slot?' : 'Eliminare questo slot?')) return;
                        setBusyId(slot.id);
                        void deleteAvailabilitySlot(slot.id).then(refresh).finally(() => setBusyId(null));
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
