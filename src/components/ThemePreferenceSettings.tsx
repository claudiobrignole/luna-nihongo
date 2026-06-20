import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { ThemePreference } from '../types/user';
import { useTheme } from '../contexts/ThemeContext';

interface ThemePreferenceSettingsProps {
  language: 'en' | 'it';
}

const OPTIONS: {
  value: ThemePreference;
  icon: React.ElementType;
  label: { en: string; it: string };
  hint: { en: string; it: string };
}[] = [
  {
    value: 'system',
    icon: Monitor,
    label: { en: 'Automatic', it: 'Automatico' },
    hint: { en: 'Follows your device', it: 'Segue il dispositivo' },
  },
  {
    value: 'light',
    icon: Sun,
    label: { en: 'Light', it: 'Chiaro' },
    hint: { en: 'Always light', it: 'Sempre chiaro' },
  },
  {
    value: 'dark',
    icon: Moon,
    label: { en: 'Dark', it: 'Scuro' },
    hint: { en: 'Always dark', it: 'Sempre scuro' },
  },
];

export const ThemePreferenceSettings: React.FC<ThemePreferenceSettingsProps> = ({
  language,
}) => {
  const { preference, setPreference } = useTheme();

  return (
    <div className="glass-panel theme-preference-settings">
      <h3 className="theme-preference-settings__title">
        {language === 'en' ? 'Appearance' : 'Aspetto'}
      </h3>
      <p className="theme-preference-settings__subtitle">
        {language === 'en'
          ? 'Choose how Luna Nihongo looks on this device.'
          : 'Scegli come appare Luna Nihongo su questo dispositivo.'}
      </p>
      <div className="theme-preference-settings__options" role="radiogroup" aria-label={language === 'en' ? 'Theme' : 'Tema'}>
        {OPTIONS.map(({ value, icon: Icon, label, hint }) => {
          const active = preference === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              className={`theme-preference-settings__option${active ? ' active' : ''}`}
              onClick={() => void setPreference(value)}
            >
              <Icon size={16} aria-hidden />
              <span className="theme-preference-settings__option-label">
                {label[language]}
              </span>
              <span className="theme-preference-settings__option-hint">
                {hint[language]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
