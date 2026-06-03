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
} from 'lucide-react';
import type { LunaUser, UserRole } from '../types/user';
import {
  assignableRoles,
  canManageTier,
  isAdminRole,
  roleLabel,
} from '../types/user';
import { listAllUsers, setUserRole, setUserTier } from '../services/userService';

interface AdminPanelProps {
  language: 'en' | 'it';
  currentUser: LunaUser;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ language, currentUser }) => {
  const [users, setUsers] = useState<LunaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isSuperAdmin = currentUser.role === 'super_admin';

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
    admins: users.filter((u) => u.role === 'admin' || u.role === 'super_admin').length,
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

  const handleTierToggle = async (target: LunaUser) => {
    const newTier = target.tier === 'premium' ? 'free' : 'premium';
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

  if (!isAdminRole(currentUser.role)) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <AlertCircle size={40} style={{ color: 'var(--error)', marginBottom: '1rem' }} />
        <p>{language === 'en' ? 'Access denied.' : 'Accesso negato.'}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '960px', margin: '0 auto' }}>

      {/* Header */}
      <div className="glass-panel" style={{
        padding: '1.5rem 2rem',
        background: 'linear-gradient(135deg, rgba(231,76,60,0.08), rgba(155,89,182,0.04))',
        borderColor: 'rgba(231,76,60,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem' }}>
          <Shield size={24} style={{ color: 'var(--primary)' }} />
          <h2 style={{ margin: 0, fontSize: '1.6rem' }}>
            {language === 'en' ? 'Admin Panel' : 'Pannello Admin'}
          </h2>
        </div>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {isSuperAdmin
            ? (language === 'en'
              ? 'Manage users, roles, and subscription tiers.'
              : 'Gestisci utenti, ruoli e piani di abbonamento.')
            : (language === 'en'
              ? 'View users and manage student subscription tiers.'
              : 'Visualizza utenti e gestisci i piani degli studenti.')}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        {[
          { label: language === 'en' ? 'Total' : 'Totale', value: stats.total, icon: Users, color: 'var(--text-main)' },
          { label: language === 'en' ? 'Students' : 'Studenti', value: stats.students, icon: GraduationCap, color: 'var(--primary)' },
          { label: language === 'en' ? 'Admins' : 'Admin', value: stats.admins, icon: Shield, color: 'var(--secondary)' },
          { label: 'Premium', value: stats.premium, icon: Crown, color: 'var(--accent)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-panel" style={{ padding: '1.2rem', textAlign: 'center' }}>
            <Icon size={20} style={{ color, marginBottom: '0.4rem' }} />
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

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
                  {[language === 'en' ? 'User' : 'Utente', 'Email', language === 'en' ? 'Role' : 'Ruolo', language === 'en' ? 'Plan' : 'Piano', 'XP', language === 'en' ? 'Actions' : 'Azioni'].map((h) => (
                    <th key={h} style={{ padding: '0.9rem 1rem', color: 'var(--text-light)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isSelf = user.id === currentUser.id;
                  const isBusy = busyId === user.id;
                  const roles = assignableRoles(currentUser, user);
                  const canTier = canManageTier(currentUser, user);

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
                        {roles.length > 0 ? (
                          <select
                            value={user.role === 'super_admin' ? 'super_admin' : user.role}
                            disabled={isBusy || user.role === 'super_admin'}
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
                            {user.role === 'super_admin' && (
                              <option value="super_admin">{roleLabel('super_admin', language)}</option>
                            )}
                            <option value="user">{roleLabel('user', language)}</option>
                            <option value="admin">{roleLabel('admin', language)}</option>
                          </select>
                        ) : (
                          <span style={{
                            fontSize: '0.78rem', fontWeight: 700, padding: '3px 8px', borderRadius: '8px',
                            backgroundColor: user.role === 'super_admin' ? 'rgba(231,76,60,0.12)' : user.role === 'admin' ? 'rgba(155,89,182,0.12)' : 'var(--primary-glow)',
                            color: user.role === 'super_admin' ? 'var(--primary)' : user.role === 'admin' ? 'var(--secondary)' : 'var(--text-muted)',
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
                      <td style={{ padding: '0.9rem 1rem' }}>
                        {canTier ? (
                          <button
                            onClick={() => void handleTierToggle(user)}
                            disabled={isBusy}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem', opacity: isBusy ? 0.6 : 1 }}
                          >
                            {isBusy ? '...' : user.tier === 'premium'
                              ? (language === 'en' ? '→ Free' : '→ Free')
                              : (language === 'en' ? '→ Premium' : '→ Premium')}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-light)', fontSize: '0.78rem' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isSuperAdmin && (
        <div className="glass-panel" style={{ padding: '1rem 1.2rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <strong>{language === 'en' ? 'Super Admin permissions:' : 'Permessi Super Admin:'}</strong>{' '}
          {language === 'en'
            ? 'Promote users to Admin, change tiers, view all data. The primary super admin account cannot be modified.'
            : 'Promuovi utenti ad Admin, cambia piani, visualizza tutti i dati. L\'account super admin principale non può essere modificato.'}
        </div>
      )}
    </div>
  );
};
