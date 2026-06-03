import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, UserPlus, LogIn, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isFirebaseConfigured } from '../lib/firebase';

interface AuthProps {
  language: 'en' | 'it';
}

export const Auth: React.FC<AuthProps> = ({ language }) => {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
        await signUp(email, password, username, language);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2.5rem 2rem',
        boxShadow: 'var(--glass-shadow)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.8rem',
            fontWeight: '700',
            marginBottom: '1rem'
          }}>
            月
          </div>
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
                placeholder="claudio@brignole.ch"
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
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-light)'
              }} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
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
    </div>
  );
};
