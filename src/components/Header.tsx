import { useEffect, useState } from 'react';
import {
  Calendar,
  Globe,
  GraduationCap,
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

export type TabType = 'path' | 'flashcards' | 'teacher' | 'booking' | 'dashboard' | 'tutor' | 'admin';
export type LanguageType = 'en' | 'it';

interface NavItem {
  id: TabType;
  icon: typeof GraduationCap;
  label: { en: string; it: string };
}

const NAV_ITEMS: NavItem[] = [
  { id: 'path', icon: GraduationCap, label: { en: 'Study', it: 'Studio' } },
  { id: 'flashcards', icon: Layers, label: { en: 'Decks', it: 'Deck' } },
  { id: 'tutor', icon: MessageCircle, label: { en: 'Tutor', it: 'Tutor' } },
  { id: 'teacher', icon: User, label: { en: 'Luna', it: 'Luna' } },
  { id: 'booking', icon: Calendar, label: { en: 'Book', it: 'Prenota' } },
];

const MOBILE_PRIMARY: NavItem[] = [
  { id: 'path', icon: GraduationCap, label: { en: 'Study', it: 'Studio' } },
  { id: 'flashcards', icon: Layers, label: { en: 'Decks', it: 'Deck' } },
  { id: 'teacher', icon: User, label: { en: 'Luna', it: 'Luna' } },
  { id: 'tutor', icon: MessageCircle, label: { en: 'Tutor', it: 'Tutor' } },
];

interface HeaderProps {
  variant: 'public' | 'app';
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  language: LanguageType;
  onLanguageToggle: () => void;
  currentUser?: LunaUser;
  onLogout?: () => void;
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
  activeTab = 'path',
  onTabChange,
  language,
  onLanguageToggle,
  currentUser,
  onLogout,
}: HeaderProps) {
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('has-mobile-nav', variant === 'app');
    return () => document.body.classList.remove('has-mobile-nav');
  }, [variant]);

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

  if (variant === 'public') {
    return (
      <header className="main-header">
        <div className="header-content header-content-public">
          <div className="header-brand" aria-label="Luna Nihongo">
            <div className="logo-circle">月</div>
            <div className="logo-text">
              <span className="logo-text-primary">Luna</span>
              <span className="logo-text-secondary">Nihongo</span>
            </div>
          </div>
          <button type="button" onClick={onLanguageToggle} className="btn btn-secondary header-lang-btn">
            <Globe size={16} />
            <span>{language === 'it' ? 'ITA' : 'ENG'}</span>
          </button>
        </div>
      </header>
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
