import { ArrowRight, X } from 'lucide-react';
import type { LanguageType } from './Header';
import { LunaLogo } from './LunaLogo';

interface RegisterPromptProps {
  language: LanguageType;
  open: boolean;
  onClose: () => void;
  onRegister: () => void;
  reason?: 'study' | 'tutor' | 'flashcards' | 'booking';
}

export function RegisterPrompt({ language, open, onClose, onRegister, reason = 'study' }: RegisterPromptProps) {
  if (!open) return null;

  const messages = {
    study: {
      en: 'Create a free account to open lessons, save progress, and use audio in every unit.',
      it: 'Crea un account gratuito per aprire le lezioni, salvare i progressi e usare l\'audio in ogni unità.',
    },
    tutor: {
      en: 'Sign up free to chat with Luna-sensei — text and natural Japanese voice.',
      it: 'Registrati gratis per chattare con Luna-sensei — testo e voce naturale in giapponese.',
    },
    flashcards: {
      en: 'Register free to sync your decks and spaced repetition across devices.',
      it: 'Registrati gratis per sincronizzare i deck e il ripasso spaziato su tutti i dispositivi.',
    },
    booking: {
      en: 'Create your free account first, then book a live lesson with Luna.',
      it: 'Crea prima il tuo account gratuito, poi prenota una lezione live con Luna.',
    },
  };

  const msg = messages[reason];

  return (
    <div className="register-prompt-backdrop" onClick={onClose} role="presentation">
      <div
        className="register-prompt-panel glass-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className="register-prompt-close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
        <div className="register-prompt-icon">
          <LunaLogo layout="icon" className="luna-logo--icon-md" alt="" />
        </div>
        <h2>{language === 'en' ? 'Free registration' : 'Registrazione gratuita'}</h2>
        <p>{msg[language]}</p>
        <p className="register-prompt-note">
          {language === 'en'
            ? 'Lessons, flashcards, and the guided path are free after signup.'
            : 'Lezioni, flashcard e percorso guidato sono gratuiti dopo la registrazione.'}
        </p>
        <button type="button" className="btn btn-primary" onClick={onRegister}>
          {language === 'en' ? 'Sign up free' : 'Registrati gratuitamente'}
          <ArrowRight size={18} />
        </button>
        <button type="button" className="register-prompt-later" onClick={onClose}>
          {language === 'en' ? 'Keep browsing' : 'Continua a esplorare'}
        </button>
      </div>
    </div>
  );
}
