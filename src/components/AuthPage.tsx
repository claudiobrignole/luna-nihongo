import { Auth } from './Auth';
import type { LanguageType } from './Header';

interface AuthPageProps {
  language: LanguageType;
  initialSignup?: boolean;
}

export function AuthPage({ language, initialSignup = true }: AuthPageProps) {
  return (
    <div className="auth-page">
      <Auth language={language} initialSignup={initialSignup} />
    </div>
  );
}
