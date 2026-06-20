import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { LunaUser } from '../types/user';
import { isStaffRole, isSuperAdminRole, canAccessTeacherDashboard } from '../types/user';
import type { AdminPanelSection } from './AdminPanel';
import { UserMenu } from './UserMenu';
import { LunaLogo } from './LunaLogo';

export type TabType =
  | 'home'
  | 'path'
  | 'flashcards'
  | 'teacher'
  | 'booking'
  | 'dashboard'
  | 'tutor'
  | 'admin'
  | 'teacher-dashboard'
  | 'auth'
  | 'privacy'
  | 'cookies'
  | 'terms'
  | 'blog';
export type LanguageType = 'en' | 'it';

interface NavItem {
  id: TabType;
  label: { en: string; it: string };
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: { en: 'Home', it: 'Home' } },
  { id: 'path', label: { en: 'Study', it: 'Studio' } },
  { id: 'flashcards', label: { en: 'Decks', it: 'Deck' } },
  { id: 'tutor', label: { en: 'Tutor', it: 'Tutor' } },
  { id: 'teacher', label: { en: 'Luna', it: 'Luna' } },
  { id: 'blog', label: { en: 'Blog', it: 'Blog' } },
];

interface HeaderProps {
  variant: 'guest' | 'app';
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  language: LanguageType;
  onLanguageToggle: () => void;
  currentUser?: LunaUser;
  onLogout?: () => void;
  onRegister?: () => void;
  onLogin?: () => void;
  onOpenOnboarding?: () => void;
  onOpenAdmin?: (section?: AdminPanelSection) => void;
}

function NavButton({
  item,
  language,
  activeTab,
  onClick,
}: {
  item: NavItem;
  language: LanguageType;
  activeTab: TabType;
  onClick: () => void;
}) {
  const isActive = activeTab === item.id;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`nav-link ${isActive ? 'active' : ''}`}
      aria-current={isActive ? 'page' : undefined}
    >
      {item.label[language]}
    </button>
  );
}

/* Toggle lingua unito: due segmenti IT / EN, quello attivo evidenziato. */
function LangToggle({
  language,
  onToggle,
  className = '',
}: {
  language: LanguageType;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <div
      className={`lang-toggle ${className}`}
      role="group"
      aria-label={language === 'en' ? 'Language' : 'Lingua'}
    >
      <button
        type="button"
        className={`lang-seg ${language === 'it' ? 'active' : ''}`}
        aria-pressed={language === 'it'}
        onClick={() => {
          if (language !== 'it') onToggle();
        }}
      >
        IT
      </button>
      <button
        type="button"
        className={`lang-seg ${language === 'en' ? 'active' : ''}`}
        aria-pressed={language === 'en'}
        onClick={() => {
          if (language !== 'en') onToggle();
        }}
      >
        EN
      </button>
    </div>
  );
}

export function Header({
  variant,
  activeTab = 'home',
  onTabChange,
  language,
  onLanguageToggle,
  currentUser,
  onLogout,
  onLogin,
  onOpenOnboarding,
  onOpenAdmin,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isGuest = variant === 'guest';

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    document.body.classList.toggle('drawer-open', menuOpen);
    return () => document.body.classList.remove('drawer-open');
  }, [menuOpen]);

  const navigate = (tab: TabType) => {
    onTabChange?.(tab);
    setMenuOpen(false);
  };

  const showTeacherDashboard = !isGuest && !!currentUser && canAccessTeacherDashboard(currentUser.role);
  const showAdmin = !isGuest && !!currentUser && isStaffRole(currentUser.role);
  const showBlogAdmin = !isGuest && !!currentUser && isSuperAdminRole(currentUser.role) && !!onOpenAdmin;

  return (
    <>
      <header className="main-header">
        <div className="header-content header-content-app">
          {isGuest ? (
            <button
              type="button"
              className="header-brand header-brand-btn"
              aria-label="Luna Nihongo"
              onClick={() => navigate('home')}
            >
              <LunaLogo layout="horizontal" theme="auto" className="luna-logo--header" />
            </button>
          ) : (
            <div className="header-brand">
              <LunaLogo layout="horizontal" theme="auto" className="luna-logo--header" />
            </div>
          )}

          <nav
            className="header-desktop-nav"
            aria-label={language === 'en' ? 'Main navigation' : 'Navigazione principale'}
          >
            {NAV_ITEMS.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                language={language}
                activeTab={activeTab}
                onClick={() => navigate(item.id)}
              />
            ))}
          </nav>

          <div className="header-actions">
            <LangToggle language={language} onToggle={onLanguageToggle} className="header-lang-toggle" />

            {isGuest ? (
              <button type="button" className="btn btn-primary header-login-btn" onClick={onLogin}>
                {language === 'en' ? 'Log in' : 'Accedi'}
              </button>
            ) : (
              currentUser &&
              onLogout && (
                <UserMenu
                  currentUser={currentUser}
                  language={language}
                  activeTab={activeTab}
                  onNavigate={navigate}
                  onLogout={onLogout}
                  onOpenOnboarding={onOpenOnboarding}
                  onOpenAdmin={onOpenAdmin}
                />
              )
            )}

            <button
              type="button"
              className="header-menu-btn"
              aria-label={language === 'en' ? 'Open menu' : 'Apri menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="nav-drawer-backdrop" onClick={() => setMenuOpen(false)}>
          <div
            className="nav-drawer"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={language === 'en' ? 'Menu' : 'Menu'}
          >
            <div className="nav-drawer-header">
              <span className="nav-drawer-title">Menu</span>
              <button
                type="button"
                className="nav-drawer-close"
                onClick={() => setMenuOpen(false)}
                aria-label={language === 'en' ? 'Close menu' : 'Chiudi menu'}
              >
                <X size={20} />
              </button>
            </div>

            <nav
              className="nav-drawer-links"
              aria-label={language === 'en' ? 'Main navigation' : 'Navigazione principale'}
            >
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-drawer-link ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => navigate(item.id)}
                >
                  {item.label[language]}
                </button>
              ))}

              {showTeacherDashboard && (
                <button
                  type="button"
                  className={`nav-drawer-link ${activeTab === 'teacher-dashboard' ? 'active' : ''}`}
                  onClick={() => navigate('teacher-dashboard')}
                >
                  {language === 'en' ? 'Teacher dashboard' : 'Dashboard maestro'}
                </button>
              )}

              {showAdmin && (
                <button
                  type="button"
                  className={`nav-drawer-link nav-drawer-link-admin ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => navigate('admin')}
                >
                  {language === 'en' ? 'Admin panel' : 'Pannello admin'}
                </button>
              )}

              {showBlogAdmin && (
                <button
                  type="button"
                  className="nav-drawer-link nav-drawer-link-admin"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenAdmin?.('blog');
                  }}
                >
                  {language === 'en' ? 'Blog articles' : 'Articoli blog'}
                </button>
              )}
            </nav>

            <div className="nav-drawer-footer">
              <LangToggle language={language} onToggle={onLanguageToggle} className="lang-toggle--block" />

              {isGuest && (
                <button
                  type="button"
                  className="btn btn-primary nav-drawer-cta"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogin?.();
                  }}
                >
                  {language === 'en' ? 'Log in' : 'Accedi'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
