import { Download, Menu, PlusSquare, Share2, X } from 'lucide-react';
import type { LanguageType } from './Header';
import type { PwaInstallHelpVariant } from '../hooks/usePwaInstall';

interface PwaInstallModalProps {
  language: LanguageType;
  variant: PwaInstallHelpVariant | null;
  open: boolean;
  onClose: () => void;
}

const TITLES: Record<PwaInstallHelpVariant, { en: string; it: string }> = {
  ios: { en: 'Install on iPhone/iPad', it: 'Installa su iPhone/iPad' },
  android: { en: 'Install on Android', it: 'Installa su Android' },
  desktop: { en: 'Install on computer', it: 'Installa su computer' },
};

export function PwaInstallModal({ language, variant, open, onClose }: PwaInstallModalProps) {
  if (!open || !variant) return null;

  const it = language === 'it';
  const title = it ? TITLES[variant].it : TITLES[variant].en;

  return (
    <div className="pwa-install-modal__overlay" role="dialog" aria-modal="true">
      <div className="glass-panel pwa-install-modal">
        <button type="button" className="pwa-install-modal__close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
        <h3>{title}</h3>
        {variant === 'ios' && (
          <ol>
            <li>
              <Share2 size={15} />
              <span>{it ? 'Apri il menu Condividi di Safari.' : 'Open Safari share menu.'}</span>
            </li>
            <li>
              <PlusSquare size={15} />
              <span>{it ? 'Tocca "Aggiungi a Home".' : 'Tap "Add to Home Screen".'}</span>
            </li>
            <li>
              <span>
                {it
                  ? 'Conferma e avvia Luna Nihongo dalla schermata Home.'
                  : 'Confirm and launch Luna Nihongo from your Home Screen.'}
              </span>
            </li>
          </ol>
        )}
        {variant === 'android' && (
          <ol>
            <li>
              <Menu size={15} />
              <span>
                {it
                  ? 'Apri il menu ⋮ di Chrome (o il browser che usi).'
                  : 'Open the ⋮ menu in Chrome (or your browser).'}
              </span>
            </li>
            <li>
              <Download size={15} />
              <span>
                {it
                  ? 'Scegli "Installa app" o "Aggiungi a schermata Home".'
                  : 'Choose "Install app" or "Add to Home screen".'}
              </span>
            </li>
            <li>
              <span>
                {it
                  ? 'Conferma: Luna Nihongo comparirà tra le tue app.'
                  : 'Confirm: Luna Nihongo will appear among your apps.'}
              </span>
            </li>
          </ol>
        )}
        {variant === 'desktop' && (
          <ol>
            <li>
              <Download size={15} />
              <span>
                {it
                  ? 'In Chrome o Edge, cerca l\'icona "Installa" nella barra degli indirizzi.'
                  : 'In Chrome or Edge, look for the "Install" icon in the address bar.'}
              </span>
            </li>
            <li>
              <Menu size={15} />
              <span>
                {it
                  ? 'In alternativa: menu del browser → "Installa Luna Nihongo" / "Installa app".'
                  : 'Alternatively: browser menu → "Install Luna Nihongo" / "Install app".'}
              </span>
            </li>
            <li>
              <span>
                {it
                  ? 'Su Safari (Mac): File → "Aggiungi al Dock".'
                  : 'On Safari (Mac): File → "Add to Dock".'}
              </span>
            </li>
          </ol>
        )}
      </div>
    </div>
  );
}
