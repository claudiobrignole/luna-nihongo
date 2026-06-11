import { useState } from 'react';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { CURRICULUM_LEVELS, SYLLABUS } from '../data/curriculum';
import { PRIVACY_POLICY_URL } from '../constants/links';
import type { LanguageType } from './Header';

interface OnboardingProps {
  language: LanguageType;
  username: string;
  initialLevel?: number;
  /** When true, open directly on level picker (returning users). */
  startAtLevelStep?: boolean;
  /** Show newsletter opt-in on level step when user has not opted in yet. */
  showMarketingOptIn?: boolean;
  onComplete: (preferredStartLevel: number, marketingConsent: boolean) => void;
  onClose?: () => void;
}

export function Onboarding({
  language,
  username,
  initialLevel = 0,
  startAtLevelStep = false,
  showMarketingOptIn = false,
  onComplete,
  onClose,
}: OnboardingProps) {
  const [step, setStep] = useState(startAtLevelStep ? 1 : 0);
  const [level, setLevel] = useState(initialLevel);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const unitCountForLevel = (lvl: number) => SYLLABUS.filter((u) => u.level === lvl).length;

  const closeButton = onClose ? (
    <button
      type="button"
      className="onboarding-close"
      onClick={onClose}
      aria-label={language === 'en' ? 'Close' : 'Chiudi'}
    >
      <X size={20} />
    </button>
  ) : null;

  if (step === 0) {
    return (
      <div className="onboarding-overlay">
        <div className="onboarding-panel glass-panel">
          {closeButton}
          <div className="onboarding-icon">月</div>
          <h2>
            {language === 'en' ? `Welcome, ${username}!` : `Benvenuto, ${username}!`}
          </h2>
          <p>
            {language === 'en'
              ? 'Luna Nihongo is a guided path to JLPT N5. You can start from any level — we recommend beginners start at Hiragana.'
              : 'Luna Nihongo è un percorso guidato verso il JLPT N5. Puoi iniziare da qualsiasi livello — per i principianti consigliamo Hiragana.'}
          </p>
          <ul className="onboarding-list">
            <li>{language === 'en' ? 'All levels are open — no locks.' : 'Tutti i livelli sono aperti — nessun blocco.'}</li>
            <li>{language === 'en' ? 'AI tutor with voice after free signup.' : 'Tutor AI con voce dopo la registrazione gratuita.'}</li>
            <li>{language === 'en' ? 'Live lessons with Luna (booking).' : 'Lezioni live con Luna (prenotazione).'}</li>
          </ul>
          <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              style={{ marginTop: '0.2rem' }}
            />
            <span>
              {language === 'en'
                ? 'Send me the Luna newsletter (Japanese tips & culture). Optional.'
                : 'Inviami la newsletter Luna (consigli e cultura giapponese). Facoltativo.'}{' '}
              <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer">
                {language === 'en' ? 'Privacy' : 'Privacy'}
              </a>
            </span>
          </label>
          <button type="button" className="btn btn-primary" onClick={() => setStep(1)}>
            {language === 'en' ? 'Choose my level' : 'Scegli il mio livello'}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-panel glass-panel onboarding-panel-wide">
        {closeButton}
        <h2>
          <Sparkles size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          {language === 'en' ? 'Where do you want to start?' : 'Da dove vuoi iniziare?'}
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          {language === 'en'
            ? 'You can change level anytime in Studio. Units within a level are all accessible.'
            : 'Puoi cambiare livello quando vuoi in Studio. Le unità del livello sono tutte accessibili.'}
        </p>
        <div className="onboarding-level-grid">
          {CURRICULUM_LEVELS.map((lvl) => (
            <button
              key={lvl.level}
              type="button"
              className={`onboarding-level-card ${level === lvl.level ? 'selected' : ''}`}
              onClick={() => setLevel(lvl.level)}
            >
              <strong>{lvl.title[language]}</strong>
              <span>{unitCountForLevel(lvl.level)} {language === 'en' ? 'units' : 'unità'}</span>
              <small>{lvl.description[language]}</small>
            </button>
          ))}
        </div>
        {showMarketingOptIn && (
          <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              style={{ marginTop: '0.2rem' }}
            />
            <span>
              {language === 'en'
                ? 'Send me the Luna newsletter (Japanese tips & culture). Optional.'
                : 'Inviami la newsletter Luna (consigli e cultura giapponese). Facoltativo.'}{' '}
              <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer">
                Privacy
              </a>
            </span>
          </label>
        )}
        <button type="button" className="btn btn-primary" onClick={() => onComplete(level, marketingConsent)}>
          {startAtLevelStep
            ? (language === 'en' ? 'Save level' : 'Salva livello')
            : (language === 'en' ? 'Start learning' : 'Inizia a studiare')}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
