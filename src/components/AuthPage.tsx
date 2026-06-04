import { ArrowLeft } from 'lucide-react';
import { Auth } from './Auth';
import type { LanguageType } from './Header';

interface AuthPageProps {
  language: LanguageType;
  initialSignup?: boolean;
  onBack: () => void;
}

export function AuthPage({ language, initialSignup = true, onBack }: AuthPageProps) {
  return (
    <div className="auth-page">
      <button type="button" className="auth-page-back btn btn-secondary" onClick={onBack}>
        <ArrowLeft size={18} />
        {language === 'en' ? 'Back' : 'Indietro'}
      </button>
      <Auth language={language} initialSignup={initialSignup} />
    </div>
  );
}
