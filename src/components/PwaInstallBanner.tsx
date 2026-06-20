import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import type { LanguageType } from './Header';
import { INSTALL_PROMPT_DELAY_MS } from '../constants/pwa';

interface PwaInstallBannerProps {
  language: LanguageType;
  visible: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export function PwaInstallBanner({
  language,
  visible,
  onInstall,
  onDismiss,
}: PwaInstallBannerProps) {
  const [delayElapsed, setDelayElapsed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDelayElapsed(true), INSTALL_PROMPT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible || !delayElapsed) return null;

  return (
    <div className="pwa-install-banner" role="dialog" aria-live="polite">
      <div className="pwa-install-banner__inner">
        <div className="pwa-install-banner__copy">
          <strong>{language === 'en' ? 'Install Luna Nihongo' : 'Installa Luna Nihongo'}</strong>
          <p>
            {language === 'en'
              ? 'Add the app to your device for quicker access.'
              : 'Aggiungi l’app al dispositivo per un accesso più rapido.'}
          </p>
        </div>
        <div className="pwa-install-banner__actions">
          <button type="button" className="mg-btn mg-btn--red" onClick={onInstall}>
            <Download size={16} />
            {language === 'en' ? 'Install' : 'Installa'}
          </button>
          <button type="button" className="pwa-install-banner__dismiss" onClick={onDismiss}>
            <X size={16} />
            {language === 'en' ? 'Not now' : 'Non ora'}
          </button>
        </div>
      </div>
    </div>
  );
}
