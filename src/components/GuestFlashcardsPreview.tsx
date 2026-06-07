import { Layers, RotateCw } from 'lucide-react';
import type { LanguageType } from './Header';

interface GuestFlashcardsPreviewProps {
  language: LanguageType;
  onRequireAuth: () => void;
}

export function GuestFlashcardsPreview({ language, onRequireAuth }: GuestFlashcardsPreviewProps) {
  return (
    <div className="guest-flashcards-preview page-view">
      <header>
        <h2>{language === 'en' ? 'Decks' : 'Deck'}</h2>
        <p>
          {language === 'en'
            ? 'Preview of spaced repetition. Your real deck syncs after free registration.'
            : 'Anteprima del ripasso spaziato. Il deck reale si sincronizza dopo la registrazione gratuita.'}
        </p>
      </header>
      <div className="guest-flashcard glass-panel" onClick={onRequireAuth} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onRequireAuth()}>
        <Layers size={20} style={{ color: 'var(--primary)' }} />
        <div className="ja-text guest-flashcard-char">あ</div>
        <p className="guest-flashcard-hint">{language === 'en' ? 'Tap to flip · register to review' : 'Tocca per girare · registrati per ripassare'}</p>
        <div className="guest-flashcard-actions">
          <button type="button" className="btn btn-secondary" disabled>
            <RotateCw size={16} />
            {language === 'en' ? 'Review' : 'Ripassa'}
          </button>
        </div>
      </div>
    </div>
  );
}
