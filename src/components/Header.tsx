import { useEffect, useState } from 'react';
import {
  Calendar,
  Globe,
  GraduationCap,
  Home,
  Layers,
  MessageCircle,
  MoreHorizontal,
  Shield,
  User,
  X,
} from 'lucide-react';
import type { LunaUser } from '../types/user';
import { isAdminRole } from '../types/user';
import { UserMenu } from './UserMenu';

export type TabType = 'home' | 'path' | 'flashcards' | 'teacher' | 'booking' | 'dashboard' | 'tutor' | 'admin' | 'auth';
export type LanguageType = 'en' | 'it';

interface NavItem {
  id: TabType;
  icon: typeof GraduationCap;
  label: { en: string; it: string };
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', icon: Home, label: { en: 'Home', it: 'Home' } },
  { id: 'path', icon: GraduationCap, label: { en: 'Study', it: 'Studio' } },
  { id: 'flashcards', icon: Layers, label: { en: 'Decks', it: 'Deck' } },
  { id: 'tutor', icon: MessageCircle, label: { en: 'Tutor', it: 'Tutor' } },
  { id: 'teacher', icon: User, label: { en: 'Luna', it: 'Luna' } },
  { id: 'booking', icon: Calendar, label: { en: 'Book', it: 'Prenota' } },
];

const MOBILE_PRIMARY: NavItem[] = [
  { id: 'home', icon: Home, label: { en: 'Home', it: 'Home' } },
  { id: 'path', icon: GraduationCap, label: { en: 'Study', it: 'Studio' } },
  { id: 'flashcards', icon: Layers, label: { en: 'Decks', it: 'Deck' } },
  { id: 'teacher', icon: User, label: { en: 'Luna', it: 'Luna' } },
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
  const Icon = item.icon;
  const isActive = activeTab === item.id;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`nav-link ${isActive ? 'active' : ''}`}
      aria-current={isActive ? 'page' : undefined}
      title={item.label[language]}
    >
      <Icon size={18} />
      <span>{item.label[language]}</span>
    </button>
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
  onRegister,
  onLogin,
  onOpenOnboarding,
}: HeaderProps) {
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const hasMobileNav = variant === 'app' || variant === 'guest';

  useEffect(() => {
    document.body.classList.toggle('has-mobile-nav', hasMobileNav);
    return () => document.body.classList.remove('has-mobile-nav');
  }, [hasMobileNav]);

  useEffect(() => {
    if (!mobileMoreOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMoreOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileMoreOpen]);

  const navigate = (tab: TabType) => {
    onTabChange?.(tab);
    setMobileMoreOpen(false);
  };

  if (variant === 'guest') {
    return (
      <>
        <header className="main-header">
          <div className="header-content header-content-app">
            <button
              type="button"
              className="header-brand header-brand-btn"
              aria-label="Luna Nihongo"
              onClick={() => navigate('home')}
            >
              <div className="logo-circle">月</div>
              <div className="logo-text logo-text-desktop">
                <span className="logo-text-primary">Luna</span>
                <span className="logo-text-secondary">Nihongo</span>
              </div>
            </button>

            <nav className="header-desktop-nav" aria-label={language === 'en' ? 'Main navigation' : 'Navigazione principale'}>
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
              <button type="button" onClick={onLanguageToggle} className="btn btn-secondary header-lang-btn">
                <Globe size={16} />
                <span className="header-lang-label">{language === 'it' ? 'ITA' : 'ENG'}</span>
              </button>
              <button type="button" className="btn btn-secondary header-login-btn" onClick={onLogin}>
                {language === 'en' ? 'Log in' : 'Accedi'}
              </button>
              <button type="button" className="btn btn-primary header-register-btn" onClick={onRegister}>
                {language === 'en' ? 'Sign up free' : 'Registrati gratuitamente'}
              </button>
            </div>
          </div>
        </header>

        <nav className="mobile-bottom-nav" aria-label={language === 'en' ? 'Mobile navigation' : 'Navigazione mobile'}>
          {MOBILE_PRIMARY.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={20} />
                <span>{item.label[language]}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileMoreOpen(true)}
            className={`mobile-nav-item ${mobileMoreOpen ? 'active' : ''}`}
            aria-label={language === 'en' ? 'More' : 'Altro'}
          >
            <MoreHorizontal size={20} />
            <span>{language === 'en' ? 'More' : 'Altro'}</span>
          </button>
        </nav>

        {mobileMoreOpen && (
          <div className="mobile-sheet-backdrop" onClick={() => setMobileMoreOpen(false)}>
            <div className="mobile-sheet" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
              <div className="mobile-sheet-header">
                <h3>{language === 'en' ? 'Menu' : 'Menu'}</h3>
                <button type="button" className="mobile-sheet-close" onClick={() => setMobileMoreOpen(false)} aria-label="Close">
                  <X size={20} />
                </button>
              </div>
              <div className="mobile-sheet-links">
                <button type="button" className={`mobile-sheet-link ${activeTab === 'tutor' ? 'active' : ''}`} onClick={() => navigate('tutor')}>
                  <MessageCircle size={20} />
                  {language === 'en' ? 'AI Tutor' : 'Tutor AI'}
                </button>
                <button type="button" className={`mobile-sheet-link ${activeTab === 'booking' ? 'active' : ''}`} onClick={() => navigate('booking')}>
                  <Calendar size={20} />
                  {language === 'en' ? 'Book a lesson' : 'Prenota lezione'}
                </button>
                <button type="button" className="mobile-sheet-link" onClick={() => { setMobileMoreOpen(false); onRegister?.(); }}>
                  <User size={20} />
                  {language === 'en' ? 'Sign up free' : 'Registrati gratuitamente'}
                </button>
                <button type="button" className="mobile-sheet-link" onClick={onLanguageToggle}>
                  <Globe size={20} />
                  {language === 'en' ? 'Switch to Italian' : 'Passa all\'inglese'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <header className="main-header">
        <div className="header-content header-content-app">
          <div className="header-brand">
            <div className="logo-circle">月</div>
            <div className="logo-text logo-text-desktop">
              <span className="logo-text-primary">Luna</span>
              <span className="logo-text-secondary">Nihongo</span>
            </div>
          </div>

          <nav className="header-desktop-nav" aria-label={language === 'en' ? 'Main navigation' : 'Navigazione principale'}>
            {NAV_ITEMS.map(item => (
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
            <button type="button" onClick={onLanguageToggle} className="btn btn-secondary header-lang-btn">
              <Globe size={16} />
              <span className="header-lang-label">{language === 'it' ? 'ITA' : 'ENG'}</span>
            </button>

            {currentUser && onLogout && (
              <UserMenu
                currentUser={currentUser}
                language={language}
                activeTab={activeTab}
                onNavigate={navigate}
                onLogout={onLogout}
                onOpenOnboarding={onOpenOnboarding}
              />
            )}
          </div>
        </div>
      </header>

      <nav className="mobile-bottom-nav" aria-label={language === 'en' ? 'Mobile navigation' : 'Navigazione mobile'}>
        {MOBILE_PRIMARY.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={20} />
              <span>{item.label[language]}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setMobileMoreOpen(true)}
          className={`mobile-nav-item ${mobileMoreOpen ? 'active' : ''}`}
          aria-label={language === 'en' ? 'More' : 'Altro'}
        >
          <MoreHorizontal size={20} />
          <span>{language === 'en' ? 'More' : 'Altro'}</span>
        </button>
      </nav>

      {mobileMoreOpen && (
        <div className="mobile-sheet-backdrop" onClick={() => setMobileMoreOpen(false)}>
          <div className="mobile-sheet" onClick={event => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="mobile-sheet-header">
              <h3>{language === 'en' ? 'Menu' : 'Menu'}</h3>
              <button type="button" className="mobile-sheet-close" onClick={() => setMobileMoreOpen(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="mobile-sheet-links">
              <button
                type="button"
                className={`mobile-sheet-link ${activeTab === 'tutor' ? 'active' : ''}`}
                onClick={() => navigate('tutor')}
              >
                <MessageCircle size={20} />
                {language === 'en' ? 'AI Tutor' : 'Tutor AI'}
              </button>

              <button
                type="button"
                className={`mobile-sheet-link ${activeTab === 'booking' ? 'active' : ''}`}
                onClick={() => navigate('booking')}
              >
                <Calendar size={20} />
                {language === 'en' ? 'Book a lesson' : 'Prenota lezione'}
              </button>

              {currentUser && isAdminRole(currentUser.role) && (
                <button
                  type="button"
                  className={`mobile-sheet-link mobile-sheet-link-admin ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => navigate('admin')}
                >
                  <Shield size={20} />
                  {language === 'en' ? 'Admin panel' : 'Pannello admin'}
                </button>
              )}

              <button type="button" className="mobile-sheet-link" onClick={onLanguageToggle}>
                <Globe size={20} />
                {language === 'en' ? 'Switch to Italian' : 'Passa all\'inglese'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
