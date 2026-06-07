import { Bot, MessageCircle, Send, Volume2 } from 'lucide-react';
import type { LanguageType } from './Header';

interface GuestTutorPreviewProps {
  language: LanguageType;
  onRequireAuth: () => void;
}

export function GuestTutorPreview({ language, onRequireAuth }: GuestTutorPreviewProps) {
  return (
    <div className="guest-tutor-preview page-view">
      <div className="guest-tutor-chat glass-panel">
        <div className="guest-tutor-header">
          <div className="logo-circle" style={{ width: 44, height: 44, fontSize: '1.2rem' }}>月</div>
          <div>
            <strong>Luna-sensei</strong>
            <span>{language === 'en' ? 'AI tutor · preview' : 'Tutor AI · anteprima'}</span>
          </div>
          <Volume2 size={18} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
        </div>
        <div className="guest-tutor-messages">
          <div className="guest-tutor-msg assistant">
            <Bot size={18} />
            <p>
              {language === 'en'
                ? 'こんにちは！ Ask me anything about Japanese once you have a free account — I reply in text and speak naturally.'
                : 'こんにちは！ Chiedimi qualsiasi cosa sul giapponese dopo la registrazione gratuita — rispondo a testo e con la voce.'}
            </p>
          </div>
          <div className="guest-tutor-msg user">
            <p>{language === 'en' ? 'How do I say "thank you"?' : 'Come si dice "grazie"?'}</p>
          </div>
          <div className="guest-tutor-msg assistant muted">
            <p>{language === 'en' ? '… unlock chat after free signup' : '… sblocca la chat dopo la registrazione gratuita'}</p>
          </div>
        </div>
        <div className="guest-tutor-input" onClick={onRequireAuth} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onRequireAuth()}>
          <MessageCircle size={18} />
          <span>{language === 'en' ? 'Type a message… (registration required)' : 'Scrivi un messaggio… (serve registrazione)'}</span>
          <Send size={18} />
        </div>
      </div>
      <p className="guest-tutor-note">
        {language === 'en'
          ? '10 free Q&A turns after signup · Premium for unlimited chat and memory.'
          : '10 turni Q&A gratuiti dopo la registrazione · Premium per chat illimitata e memoria.'}
      </p>
    </div>
  );
}
