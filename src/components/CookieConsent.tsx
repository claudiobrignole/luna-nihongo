import { useEffect, useState } from 'react';
import { Cookie, X } from 'lucide-react';
import { useConsent } from '../contexts/ConsentContext';
import { ALL_DENIED, type ConsentCategory, type ConsentState } from '../utils/consent';
import type { LanguageType } from './Header';

interface CookieConsentProps {
  language: LanguageType;
  onOpenPolicy: (page: 'cookies' | 'privacy') => void;
}

interface CategoryCopy {
  key: Exclude<ConsentCategory, 'necessary'> | 'necessary';
  title: { it: string; en: string };
  desc: { it: string; en: string };
  locked?: boolean;
}

const CATEGORIES: CategoryCopy[] = [
  {
    key: 'necessary',
    locked: true,
    title: { it: 'Necessari', en: 'Necessary' },
    desc: {
      it: 'Indispensabili per accesso, autenticazione e sicurezza. Sempre attivi.',
      en: 'Essential for login, authentication and security. Always on.',
    },
  },
  {
    key: 'preferences',
    title: { it: 'Preferenze', en: 'Preferences' },
    desc: {
      it: 'Ricordano lingua e impostazioni per un’esperienza su misura.',
      en: 'Remember language and settings for a tailored experience.',
    },
  },
  {
    key: 'analytics',
    title: { it: 'Statistiche', en: 'Analytics' },
    desc: {
      it: 'Dati aggregati e anonimi per capire come migliorare il sito.',
      en: 'Aggregated, anonymous data to understand how to improve the site.',
    },
  },
  {
    key: 'marketing',
    title: { it: 'Marketing', en: 'Marketing' },
    desc: {
      it: 'Per misurare campagne e proporre contenuti pertinenti.',
      en: 'To measure campaigns and offer relevant content.',
    },
  },
];

export function CookieConsent({ language, onOpenPolicy }: CookieConsentProps) {
  const { decision, bannerOpen, prefsOpen, acceptAll, rejectAll, savePreferences, openPreferences, closePreferences } =
    useConsent();
  const it = language === 'it';
  const [draft, setDraft] = useState<ConsentState>(decision ?? ALL_DENIED);

  useEffect(() => {
    if (prefsOpen) setDraft(decision ?? ALL_DENIED);
  }, [prefsOpen, decision]);

  useEffect(() => {
    if (!prefsOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closePreferences();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [prefsOpen, closePreferences]);

  const toggle = (key: ConsentCategory) => {
    if (key === 'necessary') return;
    setDraft((d) => ({ ...d, [key]: !d[key] }));
  };

  const showBanner = bannerOpen && !prefsOpen;

  return (
    <>
      {showBanner && (
        <div className="cookie-banner" role="dialog" aria-modal="false" aria-label={it ? 'Consenso cookie' : 'Cookie consent'}>
          <div className="cookie-banner-inner">
            <div className="cookie-banner-text">
              <p className="cookie-banner-title">
                <Cookie size={18} aria-hidden="true" />
                {it ? 'Rispettiamo la tua privacy' : 'We respect your privacy'}
              </p>
              <p className="cookie-banner-body">
                {it
                  ? 'Usiamo cookie tecnici necessari al funzionamento e, solo con il tuo consenso, cookie per preferenze, statistiche e marketing. Puoi accettare, rifiutare o scegliere.'
                  : 'We use necessary cookies to run the site and, only with your consent, cookies for preferences, analytics and marketing. You can accept, reject or choose.'}{' '}
                <button type="button" className="cookie-link" onClick={() => onOpenPolicy('cookies')}>
                  {it ? 'Cookie policy' : 'Cookie policy'}
                </button>
                {' · '}
                <button type="button" className="cookie-link" onClick={() => onOpenPolicy('privacy')}>
                  {it ? 'Privacy' : 'Privacy'}
                </button>
              </p>
            </div>
            <div className="cookie-banner-actions">
              <button type="button" className="mg-btn" onClick={openPreferences}>
                {it ? 'Personalizza' : 'Customize'}
              </button>
              <button type="button" className="mg-btn mg-btn--ink" onClick={rejectAll}>
                {it ? 'Rifiuta' : 'Reject'}
              </button>
              <button type="button" className="mg-btn mg-btn--red" onClick={acceptAll}>
                {it ? 'Accetta tutti' : 'Accept all'}
              </button>
            </div>
          </div>
        </div>
      )}

      {prefsOpen && (
        <div className="cookie-modal-backdrop" onClick={closePreferences}>
          <div
            className="cookie-modal mg-card"
            role="dialog"
            aria-modal="true"
            aria-label={it ? 'Preferenze cookie' : 'Cookie preferences'}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cookie-modal-head">
              <h2 className="cookie-modal-title" lang="ja">
                クッキー設定
                <span>{it ? 'Preferenze cookie' : 'Cookie preferences'}</span>
              </h2>
              <button type="button" className="cookie-modal-close" onClick={closePreferences} aria-label={it ? 'Chiudi' : 'Close'}>
                <X size={20} />
              </button>
            </div>

            <div className="cookie-cats">
              {CATEGORIES.map((cat) => {
                const on = cat.locked ? true : draft[cat.key as ConsentCategory];
                return (
                  <label key={cat.key} className={`cookie-cat ${cat.locked ? 'is-locked' : ''}`}>
                    <div className="cookie-cat-text">
                      <span className="cookie-cat-title">{cat.title[language]}</span>
                      <span className="cookie-cat-desc">{cat.desc[language]}</span>
                    </div>
                    <span className={`cookie-switch ${on ? 'on' : ''} ${cat.locked ? 'locked' : ''}`} aria-hidden="true">
                      <span className="cookie-switch-dot" />
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only-input"
                      checked={on}
                      disabled={cat.locked}
                      onChange={() => toggle(cat.key as ConsentCategory)}
                    />
                  </label>
                );
              })}
            </div>

            <div className="cookie-modal-actions">
              <button type="button" className="mg-btn" onClick={rejectAll}>
                {it ? 'Rifiuta tutti' : 'Reject all'}
              </button>
              <button type="button" className="mg-btn mg-btn--ink" onClick={() => savePreferences(draft)}>
                {it ? 'Salva scelte' : 'Save choices'}
              </button>
              <button type="button" className="mg-btn mg-btn--red" onClick={acceptAll}>
                {it ? 'Accetta tutti' : 'Accept all'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
