import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LayoutDashboard, LogOut, Shield } from 'lucide-react';
import type { LunaUser } from '../types/user';
import { isAdminRole, roleLabel } from '../types/user';

type TabType = 'home' | 'path' | 'flashcards' | 'teacher' | 'booking' | 'dashboard' | 'tutor' | 'admin' | 'auth';
type LanguageType = 'en' | 'it';

interface UserMenuProps {
  currentUser: LunaUser;
  language: LanguageType;
  activeTab: TabType;
  onNavigate: (tab: TabType) => void;
  onLogout: () => void;
}

export function UserMenu({ currentUser, language, activeTab, onNavigate, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isAdmin = isAdminRole(currentUser.role);
  const initial = currentUser.username.charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const closeAndNavigate = (tab: TabType) => {
    setOpen(false);
    onNavigate(tab);
  };

  const closeAndLogout = () => {
    setOpen(false);
    onLogout();
  };

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className={`user-menu-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="user-menu-avatar" aria-hidden="true">{initial}</span>
        <span className="user-menu-name">{currentUser.username}</span>
        <ChevronDown size={16} className={`user-menu-chevron ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <div className="user-menu-dropdown" role="menu">
          <div className="user-menu-header">
            <span className="user-menu-avatar user-menu-avatar-lg">{initial}</span>
            <div className="user-menu-meta">
              <strong>{currentUser.username}</strong>
              <span className="user-menu-email">{currentUser.email}</span>
              <div className="user-menu-badges">
                {isAdmin && (
                  <span className="user-menu-badge user-menu-badge-admin">
                    <Shield size={12} />
                    {roleLabel(currentUser.role, language)}
                  </span>
                )}
                {currentUser.tier === 'premium' && (
                  <span className="user-menu-badge user-menu-badge-premium">Premium</span>
                )}
              </div>
            </div>
          </div>

          <div className="user-menu-divider" />

          <button
            type="button"
            role="menuitem"
            className={`user-menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => closeAndNavigate('dashboard')}
          >
            <LayoutDashboard size={18} />
            {language === 'en' ? 'My profile' : 'Il mio profilo'}
          </button>

          {isAdmin && (
            <button
              type="button"
              role="menuitem"
              className={`user-menu-item user-menu-item-admin ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => closeAndNavigate('admin')}
            >
              <Shield size={18} />
              {language === 'en' ? 'Admin panel' : 'Pannello admin'}
            </button>
          )}

          <div className="user-menu-divider" />

          <button type="button" role="menuitem" className="user-menu-item user-menu-item-danger" onClick={closeAndLogout}>
            <LogOut size={18} />
            {language === 'en' ? 'Sign out' : 'Esci'}
          </button>
        </div>
      )}
    </div>
  );
}
