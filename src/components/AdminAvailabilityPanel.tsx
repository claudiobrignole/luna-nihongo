import React, { useCallback, useEffect, useState } from 'react';
import { CalendarPlus, Loader2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import type { SlotType } from '../types/availability';
import { INTRO_SLOT_DURATION_MINUTES, defaultMaxParticipants } from '../types/availability';
import type { LunaUser } from '../types/user';
import { isSuperAdminRole, isTeacherRole } from '../types/user';
import { getTeacherPublicName } from '../types/teacher';
import {
  createAvailabilitySlot,
  deleteAvailabilitySlot,
  loadAllAvailabilitySlotsAdmin,
  toggleAvailabilitySlot,
} from '../services/availabilityService';
import { adminDeactivateSlotRemote } from '../services/adminBookingService';
import { listAllUsers } from '../services/userService';

interface AdminAvailabilityPanelProps {
  language: 'en' | 'it';
  currentUser: LunaUser;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (h ?? 0) * 60 + (m ?? 0) + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

export const AdminAvailabilityPanel: React.FC<AdminAvailabilityPanelProps> = ({ language, currentUser }) => {
  const isSuperAdmin = isSuperAdminRole(currentUser.role);
  const isTeacher = isTeacherRole(currentUser.role);
  const [teachers, setTeachers] = useState<LunaUser[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState(currentUser.id);
  const [slots, setSlots] = useState<Awaited<ReturnType<typeof loadAllAvailabilitySlotsAdmin>>>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [slotType, setSlotType] = useState<SlotType>('intro');
  const [notes, setNotes] = useState('');

  const activeTeacherId = isTeacher ? currentUser.id : selectedTeacherId;
  const activeTeacher = teachers.find((t) => t.id === activeTeacherId) ?? currentUser;

  useEffect(() => {
    if (isSuperAdmin) {
      void listAllUsers().then((users) => {
        setTeachers(users.filter((u) => u.role === 'teacher' || u.role === 'super_admin'));
      });
    } else {
      setTeachers([currentUser]);
    }
  }, [isSuperAdmin, currentUser]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSlots(await loadAllAvailabilitySlotsAdmin(isTeacher ? currentUser.id : activeTeacherId || undefined));
    } finally {
      setLoading(false);
    }
  }, [isTeacher, currentUser.id, activeTeacherId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !activeTeacherId) return;
    setBusyId('create');
    try {
      const duration = slotType === 'intro' ? INTRO_SLOT_DURATION_MINUTES : 60;
      await createAvailabilitySlot({
        date,
        startTime,
        endTime: addMinutesToTime(startTime, duration),
        slotType,
        teacherId: activeTeacherId,
        teacherDisplayName: getTeacherPublicName(activeTeacher),
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
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h3 style={{ margin: 0 }}>
        {language === 'en' ? 'Lesson availability' : 'Disponibilità lezioni'}
      </h3>

      {isSuperAdmin && teachers.length > 0 && (
        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
          {language === 'en' ? 'Teacher' : 'Maestro/a'}
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            style={{ display: 'block', marginTop: 4, padding: '0.5rem', borderRadius: 8, width: '100%', maxWidth: 360 }}
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{getTeacherPublicName(t)}</option>
            ))}
          </select>
        </label>
      )}

      {!isTeacher && (
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {language === 'en'
            ? `Slots for ${getTeacherPublicName(activeTeacher)}`
            : `Slot per ${getTeacherPublicName(activeTeacher)}`}
        </p>
      )}

      <form onSubmit={(e) => void handleCreate(e)} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
        <label>
          {language === 'en' ? 'Date' : 'Data'}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ display: 'block', marginTop: 4, padding: '0.45rem' }} />
        </label>
        <label>
          {language === 'en' ? 'Start' : 'Inizio'}
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required style={{ display: 'block', marginTop: 4, padding: '0.45rem' }} />
        </label>
        <label>
          {language === 'en' ? 'Type' : 'Tipo'}
          <select value={slotType} onChange={(e) => setSlotType(e.target.value as SlotType)} style={{ display: 'block', marginTop: 4, padding: '0.45rem' }}>
            <option value="intro">{language === 'en' ? 'Intro (30 min)' : 'Intro (30 min)'}</option>
            <option value="regular">{language === 'en' ? 'Regular (60 min)' : 'Regolare (60 min)'}</option>
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={busyId === 'create'}>
          <CalendarPlus size={16} /> {language === 'en' ? 'Add slot' : 'Aggiungi slot'}
        </button>
      </form>

      {loading ? (
        <Loader2 size={24} className="spin" />
      ) : slots.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>{language === 'en' ? 'No slots yet.' : 'Nessuno slot.'}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {slots.map((slot) => (
            <div key={slot.id} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', padding: '0.65rem', border: '1px solid var(--border)', borderRadius: 10 }}>
              <strong>{slot.date}</strong> {slot.startTime}–{slot.endTime}
              <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{slot.slotType}</span>
              <span style={{ fontSize: '0.8rem' }}>{slot.participantCount}/{slot.maxParticipants}</span>
              <button type="button" className="btn btn-secondary" disabled={busyId === slot.id} onClick={() => void toggleAvailabilitySlot(slot.id, !slot.active).then(refresh)}>
                {slot.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              </button>
              {slot.participantCount === 0 ? (
                <button type="button" className="btn btn-secondary" disabled={busyId === slot.id} onClick={() => void deleteAvailabilitySlot(slot.id).then(refresh)}>
                  <Trash2 size={16} />
                </button>
              ) : isSuperAdmin ? (
                <button type="button" className="btn btn-secondary" disabled={busyId === slot.id} onClick={() => void adminDeactivateSlotRemote({ slotId: slot.id }).then(refresh)}>
                  {language === 'en' ? 'Deactivate' : 'Disattiva'}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
