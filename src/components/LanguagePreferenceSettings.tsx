import { Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LanguagePreferenceSettingsProps {
  language: 'en' | 'it';
}

export function LanguagePreferenceSettings({ language }: LanguagePreferenceSettingsProps) {
  const { language: current, setLanguage } = useLanguage();
  const it = language === 'it';

  return (
    <div className="glass-panel language-preference-settings">
      <h3 className="language-preference-settings__title">
        <Globe size={18} aria-hidden="true" />
        {it ? 'Lingua' : 'Language'}
      </h3>
      <p className="language-preference-settings__subtitle">
        {it
          ? 'Scegli la lingua dell’interfaccia su questo dispositivo.'
          : 'Choose the interface language on this device.'}
      </p>
      <div
        className="lang-toggle lang-toggle--block language-preference-settings__toggle"
        role="radiogroup"
        aria-label={it ? 'Lingua' : 'Language'}
      >
        <button
          type="button"
          role="radio"
          aria-checked={current === 'it'}
          className={`lang-seg ${current === 'it' ? 'active' : ''}`}
          onClick={() => void setLanguage('it')}
        >
          IT
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={current === 'en'}
          className={`lang-seg ${current === 'en' ? 'active' : ''}`}
          onClick={() => void setLanguage('en')}
        >
          EN
        </button>
      </div>
    </div>
  );
}
