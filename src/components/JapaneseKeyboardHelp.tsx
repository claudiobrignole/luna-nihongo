import React from 'react';
import { Smartphone, X } from 'lucide-react';

interface JapaneseKeyboardHelpProps {
  language: 'it' | 'en';
  open: boolean;
  onClose: () => void;
}

type PlatformId = 'iphone' | 'android' | 'mac' | 'windows';

interface PlatformGuide {
  id: PlatformId;
  title: { it: string; en: string };
  steps: { it: string[]; en: string[] };
  tip: { it: string; en: string };
}

const PLATFORMS: PlatformGuide[] = [
  {
    id: 'iphone',
    title: { it: 'iPhone / iPad', en: 'iPhone / iPad' },
    steps: {
      it: [
        'Apri Impostazioni → Generali → Tastiera → Tastiere.',
        'Tocca Aggiungi nuova tastiera… → Giapponese.',
        'Scegli Kana (あ) per sillabario, oppure Romaji se preferisci digitare in latino.',
      ],
      en: [
        'Open Settings → General → Keyboard → Keyboards.',
        'Tap Add New Keyboard… → Japanese.',
        'Choose Kana (あ) for syllabary input, or Romaji if you prefer typing in Latin letters.',
      ],
    },
    tip: {
      it: 'Per cambiare tastiera: tocca l’icona 🌐 in basso a sinistra sulla tastiera (o tieni premuto lo spazio).',
      en: 'To switch keyboards: tap the 🌐 icon at the bottom-left of the keyboard (or hold the space bar).',
    },
  },
  {
    id: 'android',
    title: { it: 'Android', en: 'Android' },
    steps: {
      it: [
        'Apri Impostazioni → Sistema → Lingue e input → Tastiera su schermo.',
        'Seleziona la tua tastiera (Gboard, Samsung, ecc.) → Lingue → Aggiungi tastiera.',
        'Aggiungi Giapponese (あ o 12 key a seconda del layout).',
      ],
      en: [
        'Open Settings → System → Languages & input → On-screen keyboard.',
        'Select your keyboard app (Gboard, Samsung, etc.) → Languages → Add keyboard.',
        'Add Japanese (あ or 12-key depending on layout).',
      ],
    },
    tip: {
      it: 'Per cambiare tastiera: icona 🌐 o barra spaziatrice sulla tastiera; su alcuni modelli, tieni premuto Invio o Spazio.',
      en: 'To switch keyboards: use the 🌐 icon or space bar on the keyboard; on some phones, hold Enter or Space.',
    },
  },
  {
    id: 'mac',
    title: { it: 'Mac', en: 'Mac' },
    steps: {
      it: [
        'Apri Impostazioni di Sistema → Tastiera → Origini di input → Modifica…',
        'Clicca + e aggiungi Giapponese — Kana o Romaji.',
        'Conferma con Fine.',
      ],
      en: [
        'Open System Settings → Keyboard → Input Sources → Edit…',
        'Click + and add Japanese — Kana or Romaji.',
        'Confirm with Done.',
      ],
    },
    tip: {
      it: 'Per cambiare: Control + Spazio (o clic sull’icona della lingua nella barra dei menu).',
      en: 'To switch: Control + Space (or click the input icon in the menu bar).',
    },
  },
  {
    id: 'windows',
    title: { it: 'Windows', en: 'Windows' },
    steps: {
      it: [
        'Apri Impostazioni → Ora e lingua → Lingua e regione → Aggiungi una lingua.',
        'Cerca Giapponese, aggiungilo e installa il pacchetto lingua (include la tastiera).',
        'In Digitazione → Tastiere avanzate, verifica che la tastiera giapponese sia attiva.',
      ],
      en: [
        'Open Settings → Time & language → Language & region → Add a language.',
        'Search for Japanese, add it, and install the language pack (includes the keyboard).',
        'Under Typing → Advanced keyboard settings, confirm the Japanese keyboard is enabled.',
      ],
    },
    tip: {
      it: 'Per cambiare tastiera: Win + Spazio (oppure Alt + Maiusc se configurato).',
      en: 'To switch keyboards: Win + Space (or Alt + Shift if configured).',
    },
  },
];

export const JapaneseKeyboardHelp: React.FC<JapaneseKeyboardHelpProps> = ({
  language,
  open,
  onClose,
}) => {
  if (!open) return null;

  const lang = language === 'en' ? 'en' : 'it';

  return (
    <div className="jp-keyboard-help-backdrop" onClick={onClose} role="presentation">
      <div
        className="jp-keyboard-help-panel glass-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="jp-keyboard-help-title"
      >
        <button
          type="button"
          className="jp-keyboard-help-close"
          onClick={onClose}
          aria-label={lang === 'en' ? 'Close' : 'Chiudi'}
        >
          <X size={20} />
        </button>

        <div className="jp-keyboard-help-header">
          <div className="jp-keyboard-help-icon" aria-hidden>
            <Smartphone size={22} />
          </div>
          <h2 id="jp-keyboard-help-title">
            {lang === 'en' ? 'How to type in Japanese' : 'Come scrivere in giapponese'}
          </h2>
          <p>
            {lang === 'en'
              ? 'Add a Japanese keyboard once — then switch to it whenever you practice writing.'
              : 'Aggiungi la tastiera giapponese una volta sola — poi passa ad essa quando eserciti la scrittura.'}
          </p>
        </div>

        <div className="jp-keyboard-help-platforms">
          {PLATFORMS.map((platform) => (
            <section key={platform.id} className="jp-keyboard-help-section">
              <h3>{platform.title[lang]}</h3>
              <ol>
                {platform.steps[lang].map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
              <p className="jp-keyboard-help-tip">
                <strong>{lang === 'en' ? 'Switch:' : 'Cambia:'}</strong> {platform.tip[lang]}
              </p>
            </section>
          ))}
        </div>

        <button type="button" className="btn btn-primary jp-keyboard-help-done" onClick={onClose}>
          {lang === 'en' ? 'Got it' : 'Ho capito'}
        </button>
      </div>
    </div>
  );
};
