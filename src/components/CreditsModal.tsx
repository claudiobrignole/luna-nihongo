import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import {
  KANJIVG_ATTRIBUTION,
  kanjiVgAttributionDetail,
} from '../constants/kanjiVgAttribution';

interface CreditsModalProps {
  language: 'it' | 'en';
  open: boolean;
  onClose: () => void;
}

export const CreditsModal: React.FC<CreditsModalProps> = ({ language, open, onClose }) => {
  if (!open) return null;

  return (
    <div className="register-prompt-backdrop" onClick={onClose} role="presentation">
      <div
        className="register-prompt-panel glass-panel credits-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="credits-modal-title"
      >
        <button
          type="button"
          className="register-prompt-close"
          onClick={onClose}
          aria-label={language === 'en' ? 'Close' : 'Chiudi'}
        >
          <X size={20} />
        </button>

        <h2 id="credits-modal-title">{language === 'en' ? 'Credits' : 'Crediti'}</h2>

        <section className="credits-section">
          <h3>{language === 'en' ? 'Stroke order data' : 'Dati ordine dei tratti'}</h3>
          <p>{kanjiVgAttributionDetail(language)}</p>
          <div className="credits-links">
            <a href={KANJIVG_ATTRIBUTION.siteUrl} target="_blank" rel="noopener noreferrer">
              {KANJIVG_ATTRIBUTION.project}
              <ExternalLink size={14} />
            </a>
            <a href={KANJIVG_ATTRIBUTION.repoUrl} target="_blank" rel="noopener noreferrer">
              GitHub
              <ExternalLink size={14} />
            </a>
            <a href={KANJIVG_ATTRIBUTION.licenseUrl} target="_blank" rel="noopener noreferrer">
              {KANJIVG_ATTRIBUTION.licenseShort}
              <ExternalLink size={14} />
            </a>
          </div>
        </section>

        <section className="credits-section">
          <h3>Luna Nihongo</h3>
          <p>
            {language === 'en'
              ? 'Curriculum, UI, and tutoring experience © Luna Nihongo.'
              : 'Curriculum, interfaccia ed esperienza tutor © Luna Nihongo.'}
          </p>
        </section>

        <button type="button" className="btn btn-primary credits-close-btn" onClick={onClose}>
          {language === 'en' ? 'Close' : 'Chiudi'}
        </button>
      </div>
    </div>
  );
};

export function KanjiVgCreditLink({
  language,
  onOpenCredits,
  className = 'stroke-kanjivg-credit-link',
}: {
  language: 'it' | 'en';
  onOpenCredits: () => void;
  className?: string;
}) {
  return (
    <button type="button" className={className} onClick={onOpenCredits}>
      {language === 'en'
        ? 'Stroke data: KanjiVG (CC-BY-SA 3.0)'
        : 'Dati tratti: KanjiVG (CC-BY-SA 3.0)'}
    </button>
  );
}
