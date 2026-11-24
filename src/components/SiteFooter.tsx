import { Download, Globe, Rss } from 'lucide-react';
import type { TabType } from './Header';
import { BLOG_RSS_URL } from '../constants/blogFeeds';
import { useLanguage } from '../contexts/LanguageContext';
import { LunaLogo } from './LunaLogo';
import { buildPath } from '../utils/routes';
import { handleInternalNavClick } from '../utils/navLink';

interface SiteFooterProps {
  onNavigate: (tab: TabType) => void;
  onOpenCookieSettings: () => void;
  onInstallApp: () => void;
}

export function SiteFooter({
  onNavigate,
  onOpenCookieSettings,
  onInstallApp,
}: SiteFooterProps) {
  const { language, toggleLanguage } = useLanguage();
  const it = language === 'it';
  const year = new Date().getFullYear();
  const rssHref = `${BLOG_RSS_URL}?lang=${language}`;

  return (
    <footer className="mg-footer">
      <div className="mg-footer-inner">
        <div className="mg-footer-brand">
          <LunaLogo layout="horizontal" theme="dark" className="luna-logo--footer" />
        </div>

        <nav className="mg-footer-links" aria-label={it ? 'Link sito' : 'Site links'}>
          <a href={rssHref} target="_blank" rel="noopener noreferrer" className="mg-footer-rss">
            <Rss size={14} aria-hidden="true" />
            RSS
          </a>
          <a href={buildPath('privacy', language)} onClick={handleInternalNavClick(() => onNavigate('privacy'))}>
            {it ? 'Privacy' : 'Privacy'}
          </a>
          <a href={buildPath('cookies', language)} onClick={handleInternalNavClick(() => onNavigate('cookies'))}>
            {it ? 'Cookie' : 'Cookies'}
          </a>
          <a href={buildPath('terms', language)} onClick={handleInternalNavClick(() => onNavigate('terms'))}>
            {it ? 'Termini e condizioni' : 'Terms & conditions'}
          </a>
          <button type="button" onClick={onOpenCookieSettings}>{it ? 'Impostazioni cookie' : 'Cookie settings'}</button>
          <button type="button" onClick={onInstallApp}>
            <Download size={14} aria-hidden="true" />
            {it ? 'Installa app' : 'Install app'}
          </button>
          <button type="button" onClick={() => void toggleLanguage()} className="mg-footer-lang">
            <Globe size={14} aria-hidden="true" />
            {language === 'it' ? 'English' : 'Italiano'}
          </button>
        </nav>
      </div>

      <div className="mg-footer-bottom">
        <span>
          © {year}{' '}
          <a href="https://naito.work" target="_blank" rel="noopener noreferrer" className="mg-footer-credit-link">
            Naito
          </a>
          {' '}&bull; {it ? 'Svizzera' : 'Switzerland'}
        </span>
        <span className="mg-footer-tag">
          {it ? 'Impara il giapponese con calore e metodo.' : 'Learn Japanese with warmth and method.'}
        </span>
      </div>
    </footer>
  );
}
