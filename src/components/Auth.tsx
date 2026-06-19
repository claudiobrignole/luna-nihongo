import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, UserPlus, LogIn, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PRIVACY_POLICY_URL } from '../constants/links';
import { isFirebaseConfigured } from '../lib/firebase';
import { LunaLogo } from './LunaLogo';

interface AuthProps {
  language: 'en' | 'it';
  initialSignup?: boolean;
}

export const Auth: React.FC<AuthProps> = ({ language, initialSignup = false }) => {
  const { signIn, signUp, resetPassword } = useAuth();
  const [isLogin, setIsLogin] = useState(!initialSignup);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!email.trim()) {
      setError(language === 'en' ? 'Please enter your email.' : 'Inserisci la tua email.');
      return;
    }

    if (!password) {
      setError(language === 'en' ? 'Please enter your password.' : 'Inserisci la password.');
      return;
    }

    if (!isLogin && !username.trim()) {
      setError(language === 'en' ? 'Please choose a display name.' : 'Scegli un nome visualizzato.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isLogin) {
        await signIn(email, password, language);
      } else {
        await signUp(email, password, username, language, { marketingConsent });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError(language === 'en' ? 'Enter your email first.' : 'Inserisci prima la tua email.');
      return;
    }
    setIsSubmitting(true);
    try {
      await resetPassword(email, language);
      setInfo(
        language === 'en'
          ? 'Password reset email sent. Check your inbox.'
          : 'Email di reset inviata. Controlla la posta.',
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isFirebaseConfigured()) {
    return (
      <div className="glass-panel" style={{
        maxWidth: '480px',
        margin: '0 auto',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <h2 style={{ marginBottom: '0.75rem' }}>Firebase non configurato</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Copia <code>.env.example</code> in <code>.env</code> e inserisci le credenziali
          del tuo progetto Firebase per abilitare login e database.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel auth-panel">
        <div style={{ textAlign: 'center' }}>
          <LunaLogo layout="vertical" theme="light" className="luna-logo--auth" />
          <h2 style={{ fontSize: '1.8rem', marginBottom: '0.3rem' }}>
            {isLogin
              ? (language === 'en' ? 'Welcome Back' : 'Bentornato')
              : (language === 'en' ? 'Create Account' : 'Nuovo Account')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isLogin
              ? (language === 'en' ? 'Log in to continue your journey' : 'Accedi per continuare il tuo viaggio')
              : (language === 'en' ? 'Join Luna Nihongo today' : 'Iscriviti oggi a Luna Nihongo')}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {error && (
            <div style={{
              fontSize: '0.85rem',
              backgroundColor: 'var(--error-glow)',
              color: 'var(--error)',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid hsla(5, 80%, 50%, 0.1)'
            }}>
              ⚠️ {error}
            </div>
          )}

          {info && (
            <div style={{
              fontSize: '0.85rem',
              backgroundColor: 'var(--success-glow)',
              color: 'var(--success)',
              padding: '8px 12px',
              borderRadius: '8px',
            }}>
              {info}
            </div>
          )}

          {!isLogin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {language === 'en' ? 'Display Name' : 'Nome visualizzato'}
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-light)'
                }} />
                <input
                  type="text"
                  placeholder={language === 'en' ? 'e.g. Claudio' : 'es. Claudio'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="name"
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem 0.8rem 2.4rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-light)'
              }} />
              <input
                type="email"
                placeholder={language === 'en' ? 'your@email.com' : 'tua@email.it'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem 0.8rem 2.4rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              {language === 'en' ? 'Password' : 'Password'}
            </label>
            <div className="auth-password-wrap">
              <Lock size={18} className="auth-field-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className="auth-password-input"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword
                  ? (language === 'en' ? 'Hide password' : 'Nascondi password')
                  : (language === 'en' ? 'Show password' : 'Mostra password')}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.82rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                style={{ marginTop: '0.2rem' }}
              />
              <span>
                {language === 'en'
                  ? 'I want to receive the Luna Nihongo newsletter (tips, culture, updates). You can unsubscribe anytime.'
                  : 'Voglio ricevere la newsletter Luna Nihongo (consigli, cultura, novità). Puoi disiscriverti in qualsiasi momento.'}{' '}
                <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer">
                  Privacy
                </a>
              </span>
            </label>
          )}

          {isLogin && (
            <button
              type="button"
              onClick={() => void handleResetPassword()}
              style={{ fontSize: '0.82rem', color: 'var(--primary)', textAlign: 'left', fontWeight: 600 }}
            >
              {language === 'en' ? 'Forgot password?' : 'Password dimenticata?'}
            </button>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ width: '100%', marginTop: '0.5rem', display: 'flex', gap: '0.5rem', opacity: isSubmitting ? 0.7 : 1 }}
          >
            {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
            <span>
              {isSubmitting
                ? (language === 'en' ? 'Please wait...' : 'Attendi...')
                : isLogin
                  ? (language === 'en' ? 'Log In' : 'Accedi')
                  : (language === 'en' ? 'Sign Up' : 'Registrati')}
            </span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            style={{
              fontSize: '0.9rem',
              color: 'var(--primary)',
              fontWeight: 600
            }}
          >
            {isLogin
              ? (language === 'en' ? "Don't have an account? Sign Up" : 'Non hai un account? Registrati')
              : (language === 'en' ? 'Already have an account? Log In' : 'Hai già un account? Accedi')}
          </button>
        </div>
    </div>
  );
};
