import { Globe } from 'lucide-react';
import type { LanguageType, TabType } from './Header';

interface SiteFooterProps {
  language: LanguageType;
  onNavigate: (tab: TabType) => void;
  onOpenCookieSettings: () => void;
  onLanguageToggle: () => void;
}

export function SiteFooter({ language, onNavigate, onOpenCookieSettings, onLanguageToggle }: SiteFooterProps) {
  const it = language === 'it';
  const year = new Date().getFullYear();

  return (
    <footer className="mg-footer">
      <div className="mg-footer-inner">
        <div className="mg-footer-brand">
          <div className="logo-circle" lang="ja">るな</div>
          <div className="logo-text">
            <span className="logo-text-primary">Luna Nihongo</span>
            <span className="logo-text-secondary" lang="ja">るな・日本語</span>
          </div>
        </div>

        <nav className="mg-footer-links" aria-label={it ? 'Note legali' : 'Legal'}>
          <button type="button" onClick={() => onNavigate('privacy')}>{it ? 'Privacy' : 'Privacy'}</button>
          <button type="button" onClick={() => onNavigate('cookies')}>{it ? 'Cookie' : 'Cookies'}</button>
          <button type="button" onClick={() => onNavigate('terms')}>{it ? 'Termini e condizioni' : 'Terms & conditions'}</button>
          <button type="button" onClick={onOpenCookieSettings}>{it ? 'Impostazioni cookie' : 'Cookie settings'}</button>
          <button type="button" onClick={onLanguageToggle} className="mg-footer-lang">
            <Globe size={14} aria-hidden="true" />
            {language === 'it' ? 'English' : 'Italiano'}
          </button>
        </nav>
      </div>

      <div className="mg-footer-bottom">
        <span>© {year} Luna Nihongo</span>
        <span className="mg-footer-tag">
          {it ? 'Impara il giapponese con calore e metodo.' : 'Learn Japanese with warmth and method.'}
        </span>
      </div>
    </footer>
  );
}
