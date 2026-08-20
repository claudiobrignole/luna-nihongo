import { createPortal } from 'react-dom';
import { Globe, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { writeLanguageSuggestDismissed } from '../utils/language';

interface LanguageSuggestModalProps {
  open: boolean;
}

export function LanguageSuggestModal({ open }: LanguageSuggestModalProps) {
  const { setLanguage } = useLanguage();

  if (!open || typeof document === 'undefined') return null;

  const keepItalian = () => {
    writeLanguageSuggestDismissed();
    void setLanguage('it');
  };

  const switchToEnglish = () => {
    writeLanguageSuggestDismissed();
    void setLanguage('en');
  };

  return createPortal(
    <div className="language-suggest-modal__overlay" role="dialog" aria-modal="true">
      <div className="glass-panel language-suggest-modal">
        <button
          type="button"
          className="language-suggest-modal__close"
          onClick={keepItalian}
          aria-label="Close"
        >
          <X size={16} />
        </button>
        <div className="language-suggest-modal__icon" aria-hidden="true">
          <Globe size={22} />
        </div>
        <h3>Switch to English?</h3>
        <p>
          Luna Nihongo is available in English. You can change the language anytime from the footer
          or your account settings.
        </p>
        <div className="language-suggest-modal__actions">
          <button type="button" className="mg-btn" onClick={keepItalian}>
            Keep Italian
          </button>
          <button type="button" className="mg-btn mg-btn--red" onClick={switchToEnglish}>
            Switch to English
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
