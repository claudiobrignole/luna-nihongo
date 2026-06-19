import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Shield,
  Users,
  Crown,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  GraduationCap,
  Sparkles,
  History,
  X,
  Trash2,
} from 'lucide-react';
import type { LunaUser, UserRole } from '../types/user';
import {
  assignableRoles,
  canChangeRole,
  canDeleteUser,
  canManageTier,
  isProtectedSuperAdmin,
  isStaffRole,
  isSuperAdminRole,
  roleLabel,
} from '../types/user';
import { listAllUsers, setUserRole, setUserTier } from '../services/userService';
import { adminDeleteUser, formatCallableError } from '../services/adminUserService';
import { listStudyActivity } from '../services/studyActivityService';
import type { StudyActivity } from '../types/study';
import { AdminAvailabilityPanel } from './AdminAvailabilityPanel';
import { AdminBlogPanel } from './AdminBlogPanel';
import { TeacherPaymentsPanel } from './TeacherPaymentsPanel';

export type AdminPanelSection = 'users' | 'availability' | 'payouts' | 'blog';

interface AdminPanelProps {
  language: 'en' | 'it';
  currentUser: LunaUser;
  initialSection?: AdminPanelSection;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ language, currentUser, initialSection = 'users' }) => {
  const [users, setUsers] = useState<LunaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [adminSection, setAdminSection] = useState<AdminPanelSection>(initialSection);
  const [activityUser, setActivityUser] = useState<LunaUser | null>(null);
  const [activityLog, setActivityLog] = useState<StudyActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LunaUser | null>(null);

  const isSuperAdmin = isSuperAdminRole(currentUser.role);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await listAllUsers();
      setUsers(all);
    } catch {
      setError(
        language === 'en'
          ? 'Could not load users. Check your permissions.'
          : 'Impossibile caricare gli utenti. Verifica i permessi.'
      );
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setAdminSection(initialSection);
  }, [initialSection]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  const stats = useMemo(() => ({
    total: users.length,
    students: users.filter((u) => u.role === 'user').length,
    teachers: users.filter((u) => u.role === 'teacher' || u.role === 'super_admin').length,
    premium: users.filter((u) => u.tier === 'premium').length,
  }), [users]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleRoleChange = async (target: LunaUser, newRole: UserRole) => {
    if (newRole === target.role) return;
    setBusyId(target.id);
    try {
      const updated = await setUserRole(currentUser, target.id, newRole);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      showSuccess(
        language === 'en'
          ? `Role updated for ${target.username}`
          : `Ruolo aggiornato per ${target.username}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusyId(null);
    }
  };

  const openActivity = async (target: LunaUser) => {
    setActivityUser(target);
    setActivityLoading(true);
    setActivityLog([]);
    try {
      const items = await listStudyActivity(target.id, 60);
      setActivityLog(items);
    } catch {
      setError(
        language === 'en'
          ? 'Could not load study history.'
          : 'Impossibile caricare lo storico studio.'
      );
    } finally {
      setActivityLoading(false);
    }
  };

  const activityTypeLabel = (type: StudyActivity['type']) => {
    const labels: Record<StudyActivity['type'], { en: string; it: string }> = {
      unit_opened: { en: 'Unit opened', it: 'Unità aperta' },
      unit_completed: { en: 'Unit completed', it: 'Unità completata' },
      quiz_completed: { en: 'Quiz done', it: 'Quiz fatto' },
      flashcard_session: { en: 'Flashcards', it: 'Flashcard' },
      tutor_message: { en: 'Tutor chat', it: 'Chat tutor' },
      live_session: { en: 'Luna Live', it: 'Luna Live' },
      level_selected: { en: 'Level chosen', it: 'Livello scelto' },
    };
    return labels[type][language];
  };

  const handleSetTier = async (target: LunaUser, newTier: 'free' | 'premium') => {
    if (target.tier === newTier) return;
    setBusyId(target.id);
    try {
      const updated = await setUserTier(currentUser, target.id, newTier);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      showSuccess(
        language === 'en'
          ? `${target.username} is now ${newTier}`
          : `${target.username} è ora ${newTier === 'premium' ? 'Premium' : 'Free'}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await adminDeleteUser(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      if (activityUser?.id === deleteTarget.id) {
        setActivityUser(null);
        setActivityLog([]);
      }
      showSuccess(
        language === 'en'
          ? `${deleteTarget.username} deleted`
          : `${deleteTarget.username} eliminato`
      );
      setDeleteTarget(null);
    } catch (err) {
      setError(formatCallableError(err));
    } finally {
      setBusyId(null);
    }
  };

  if (!isStaffRole(currentUser.role)) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <AlertCircle size={40} style={{ color: 'var(--error)', marginBottom: '1rem' }} />
        <p>{language === 'en' ? 'Access denied.' : 'Accesso negato.'}</p>
      </div>
    );
  }

  return (
    <div className="page-view" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div className="glass-panel" style={{
        padding: '1.5rem 2rem',
        background: 'linear-gradient(135deg, var(--ln-red-a08), rgba(155,89,182,0.04))',
        borderColor: 'var(--ln-red-a20)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem' }}>
          <Shield size={24} style={{ color: 'var(--primary)' }} />
          <h2 style={{ margin: 0, fontSize: '1.6rem' }}>
            {language === 'en' ? 'Admin Panel' : 'Pannello Admin'}
          </h2>
        </div>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          { isSuperAdmin
            ? (language === 'en'
              ? 'Manage users, availability, teacher payments and blog posts.'
              : 'Gestisci utenti, disponibilità, pagamenti maestri e articoli del blog.')
            : (language === 'en'
              ? 'View users and manage your lesson availability.'
              : 'Visualizza utenti e gestisci la tua disponibilità lezioni.')}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        {[
          { label: language === 'en' ? 'Total' : 'Totale', value: stats.total, icon: Users, color: 'var(--text-main)' },
          { label: language === 'en' ? 'Students' : 'Studenti', value: stats.students, icon: GraduationCap, color: 'var(--primary)' },
          { label: language === 'en' ? 'Teachers' : 'Maestri', value: stats.teachers, icon: Shield, color: 'var(--secondary)' },
          { label: 'Premium', value: stats.premium, icon: Crown, color: 'var(--accent)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-panel" style={{ padding: '1.2rem', textAlign: 'center' }}>
            <Icon size={20} style={{ color, marginBottom: '0.4rem' }} />
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={adminSection === 'users' ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={() => setAdminSection('users')}
        >
          {language === 'en' ? 'Users' : 'Utenti'}
        </button>
        <button
          type="button"
          className={adminSection === 'availability' ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={() => setAdminSection('availability')}
        >
          {language === 'en' ? 'Availability' : 'Disponibilità'}
        </button>
        {isSuperAdmin && (
          <button
            type="button"
            className={adminSection === 'payouts' ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setAdminSection('payouts')}
          >
            {language === 'en' ? 'Teacher payments' : 'Pagamenti maestri'}
          </button>
        )}
        {isSuperAdmin && (
          <button
            type="button"
            className={adminSection === 'blog' ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setAdminSection('blog')}
          >
            Blog
          </button>
        )}
      </div>

      {adminSection === 'availability' ? (
        <AdminAvailabilityPanel language={language} currentUser={currentUser} />
      ) : adminSection === 'payouts' && isSuperAdmin ? (
        <TeacherPaymentsPanel language={language} />
      ) : adminSection === 'blog' && isSuperAdmin ? (
        <AdminBlogPanel language={language} currentUser={currentUser} />
      ) : (
        <>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
          <input
            type="text"
            placeholder={language === 'en' ? 'Search by name or email...' : 'Cerca per nome o email...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.7rem 1rem 0.7rem 2.4rem',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-main)',
              fontSize: '0.9rem',
            }}
          />
        </div>
        <button
          onClick={() => void fetchUsers()}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          disabled={loading}
        >
          <RefreshCw size={16} />
          {language === 'en' ? 'Refresh' : 'Aggiorna'}
        </button>
      </div>

      {successMsg && (
        <div style={{
          padding: '0.8rem 1rem', borderRadius: '10px',
          backgroundColor: 'var(--success-glow)', color: 'var(--success)',
          fontSize: '0.85rem', fontWeight: 600,
        }}>
          ✓ {successMsg}
        </div>
      )}

      {error && (
        <div style={{
          padding: '0.8rem 1rem', borderRadius: '10px',
          backgroundColor: 'var(--error-glow)', color: 'var(--error)',
          fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>✕</button>
        </div>
      )}

      {/* Users table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={32} style={{ margin: '0 auto 1rem' }} />
            {language === 'en' ? 'Loading users...' : 'Caricamento utenti...'}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            {language === 'en' ? 'No users found.' : 'Nessun utente trovato.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  {[language === 'en' ? 'User' : 'Utente', 'Email', language === 'en' ? 'Role' : 'Ruolo', language === 'en' ? 'Plan' : 'Piano', 'XP', language === 'en' ? 'Lessons' : 'Lezioni', language === 'en' ? 'Actions' : 'Azioni'].map((h) => (
                    <th key={h} style={{ padding: '0.9rem 1rem', color: 'var(--text-light)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isSelf = user.id === currentUser.id;
                  const isBusy = busyId === user.id;
                  const roles = assignableRoles(currentUser, user);
                  const canRole = canChangeRole(currentUser, user);
                  const canTier = canManageTier(currentUser, user);
                  const canDelete = canDeleteUser(currentUser, user);
                  const roleLocked = isProtectedSuperAdmin(user.email);

                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ fontWeight: 600 }}>{user.username}</div>
                        {isSelf && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>
                            {language === 'en' ? '(you)' : '(tu)'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', color: 'var(--text-muted)' }}>{user.email}</td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        {canRole ? (
                          <select
                            value={user.role}
                            disabled={isBusy || roleLocked}
                            onChange={(e) => void handleRoleChange(user, e.target.value as UserRole)}
                            style={{
                              padding: '0.35rem 0.6rem',
                              borderRadius: '8px',
                              border: '1px solid var(--border)',
                              backgroundColor: 'var(--bg-input)',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                            }}
                          >
                            {roles.map((role) => (
                              <option key={role} value={role}>{roleLabel(role, language)}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={{
                            fontSize: '0.78rem', fontWeight: 700, padding: '3px 8px', borderRadius: '8px',
                            backgroundColor: user.role === 'super_admin' ? 'var(--ln-red-a12)' : user.role === 'teacher' ? 'rgba(155,89,182,0.12)' : 'var(--primary-glow)',
                            color: user.role === 'super_admin' ? 'var(--primary)' : user.role === 'teacher' ? 'var(--secondary)' : 'var(--text-muted)',
                          }}>
                            {roleLabel(user.role, language)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{
                          fontSize: '0.78rem', fontWeight: 700, padding: '3px 8px', borderRadius: '8px',
                          backgroundColor: user.tier === 'premium' ? 'rgba(155,89,182,0.12)' : 'var(--primary-glow)',
                          color: user.tier === 'premium' ? 'var(--secondary)' : 'var(--text-muted)',
                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                        }}>
                          {user.tier === 'premium' ? <Crown size={11} /> : null}
                          {user.tier === 'premium' ? 'Premium' : 'Free'}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: 'var(--accent)', fontWeight: 600 }}>
                          <Sparkles size={13} /> {user.xp}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', fontWeight: 600 }}>
                        {user.completedUnits.length}
                      </td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => void openActivity(user)}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <History size={14} />
                            {language === 'en' ? 'History' : 'Storico'}
                          </button>
                          {canTier ? (
                            <>
                              {user.tier !== 'premium' && (
                                <button
                                  type="button"
                                  onClick={() => void handleSetTier(user, 'premium')}
                                  disabled={isBusy}
                                  className="btn btn-secondary"
                                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem', opacity: isBusy ? 0.6 : 1 }}
                                >
                                  {isBusy ? '...' : (language === 'en' ? '→ Premium' : '→ Premium')}
                                </button>
                              )}
                              {user.tier === 'premium' && (
                                <button
                                  type="button"
                                  onClick={() => void handleSetTier(user, 'free')}
                                  disabled={isBusy}
                                  className="btn btn-secondary"
                                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem', opacity: isBusy ? 0.6 : 1 }}
                                >
                                  {isBusy ? '...' : (language === 'en' ? '→ Free' : '→ Free')}
                                </button>
                              )}
                            </>
                          ) : null}
                          {canDelete ? (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(user)}
                              disabled={isBusy}
                              className="btn btn-secondary"
                              style={{
                                fontSize: '0.78rem',
                                padding: '0.35rem 0.7rem',
                                color: 'var(--error)',
                                opacity: isBusy ? 0.6 : 1,
                              }}
                            >
                              <Trash2 size={14} />
                              {language === 'en' ? 'Delete' : 'Elimina'}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activityUser && (
        <div className="glass-panel admin-activity-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <History size={20} style={{ color: 'var(--primary)' }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                {language === 'en' ? 'Study history' : 'Storico studio'} — {activityUser.username}
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {activityUser.email} · {activityUser.completedUnits.length}{' '}
                {language === 'en' ? 'units completed' : 'unità completate'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActivityUser(null)}
              className="btn btn-secondary"
              style={{ padding: '0.4rem' }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {activityLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <Loader2 size={28} style={{ margin: '0 auto 0.75rem' }} />
              {language === 'en' ? 'Loading activity…' : 'Caricamento attività…'}
            </div>
          ) : activityLog.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              {language === 'en'
                ? 'No logged activity yet. Events appear when the student opens units, completes lessons, or chats with the tutor.'
                : 'Nessuna attività registrata. Gli eventi compaiono quando lo studente apre unità, completa lezioni o usa il tutor.'}
            </p>
          ) : (
            <div className="admin-activity-list">
              {activityLog.map((item) => (
                <div key={item.id} className="admin-activity-item">
                  <span className="admin-activity-type">{activityTypeLabel(item.type)}</span>
                  <span>{item.label}</span>
                  {item.unitId && (
                    <span style={{ color: 'var(--text-light)', fontSize: '0.75rem' }}>{item.unitId}</span>
                  )}
                  <time className="admin-activity-time">
                    {new Date(item.createdAt).toLocaleString(language === 'en' ? 'en-US' : 'it-IT')}
                  </time>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
        </>
      )}

      {deleteTarget && (
        <div className="register-prompt-backdrop" onClick={() => setDeleteTarget(null)} role="presentation">
          <div
            className="register-prompt-panel glass-panel admin-delete-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="register-prompt-close"
              onClick={() => setDeleteTarget(null)}
              aria-label={language === 'en' ? 'Close' : 'Chiudi'}
            >
              <X size={20} />
            </button>
            <div className="register-prompt-icon" style={{ background: 'var(--error-glow)', color: 'var(--error)' }}>
              <Trash2 size={28} />
            </div>
            <h2>{language === 'en' ? 'Delete user?' : 'Eliminare utente?'}</h2>
            <p style={{ textAlign: 'left', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {language === 'en'
                ? `This permanently removes ${deleteTarget.username} (${deleteTarget.email}), their profile, study data, and login account. This cannot be undone.`
                : `Questo rimuove definitivamente ${deleteTarget.username} (${deleteTarget.email}), profilo, dati di studio e account di accesso. Operazione irreversibile.`}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteTarget(null)}>
                {language === 'en' ? 'Cancel' : 'Annulla'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, background: 'var(--error)', borderColor: 'var(--error)' }}
                disabled={busyId === deleteTarget.id}
                onClick={() => void handleDeleteUser()}
              >
                {busyId === deleteTarget.id
                  ? (language === 'en' ? 'Deleting…' : 'Eliminazione…')
                  : (language === 'en' ? 'Delete permanently' : 'Elimina definitivamente')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSuperAdmin && (
        <div className="glass-panel" style={{ padding: '1rem 1.2rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <strong>{language === 'en' ? 'Super Admin permissions:' : 'Permessi Super Admin:'}</strong>{' '}
          {language === 'en'
            ? 'Promote users to Admin, grant or revoke Premium, delete users, view all data. The primary super admin account cannot be modified or deleted.'
            : 'Promuovi utenti ad Admin, assegna o revoca Premium, elimina utenti, visualizza tutti i dati. L\'account super admin principale non può essere modificato o eliminato.'}
        </div>
      )}
    </div>
  );
};
