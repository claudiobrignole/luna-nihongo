import React, { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import type { LunaUser } from '../types/user';
import { PRIVACY_POLICY_URL } from '../constants/links';
import { formatEmailCallableError, subscribeNewsletter } from '../services/emailService';

interface NewsletterPreferenceSettingsProps {
  language: 'en' | 'it';
  currentUser: LunaUser;
  onMarketingConsentChange: (consent: boolean) => Promise<void>;
}

export const NewsletterPreferenceSettings: React.FC<NewsletterPreferenceSettingsProps> = ({
  language,
  currentUser,
  onMarketingConsentChange,
}) => {
  const [name, setName] = useState(currentUser.username);
  const [email, setEmail] = useState(currentUser.email);
  const [privacyAccepted, setPrivacyAccepted] = useState(currentUser.marketingConsent === true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscribed = currentUser.marketingConsent === true;

  useEffect(() => {
    setName(currentUser.username);
    setEmail(currentUser.email);
    setPrivacyAccepted(currentUser.marketingConsent === true);
  }, [currentUser.id, currentUser.username, currentUser.email, currentUser.marketingConsent]);

  const subscribe = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) {
      setError(
        language === 'en'
          ? 'Enter your name and email.'
          : 'Inserisci nome e email.',
      );
      return;
    }
    if (!privacyAccepted) {
      setError(
        language === 'en'
          ? 'Accept the privacy policy to subscribe.'
          : 'Accetta l\'informativa privacy per iscriverti.',
      );
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await subscribeNewsletter({
        email: trimmedEmail,
        firstName: trimmedName,
        language,
      });
      await onMarketingConsentChange(true);
    } catch (err) {
      setError(formatEmailCallableError(err, language));
    } finally {
      setBusy(false);
    }
  };

  const unsubscribe = async () => {
    setBusy(true);
    setError(null);
    try {
      await onMarketingConsentChange(false);
      setPrivacyAccepted(false);
    } catch {
      setError(
        language === 'en'
          ? 'Could not update your preferences. Try again.'
          : 'Impossibile aggiornare le preferenze. Riprova.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-panel newsletter-preference-settings">
      <h3 className="newsletter-preference-settings__title">
        <Mail size={18} aria-hidden />
        {language === 'en' ? 'Newsletter' : 'Newsletter'}
      </h3>
      <p className="newsletter-preference-settings__subtitle">
        {language === 'en'
          ? 'Japanese tips, culture and Luna Nihongo updates by email.'
          : 'Consigli di giapponese, cultura e novità da Luna Nihongo via email.'}
      </p>

      <div className="newsletter-preference-settings__fields">
        <label className="newsletter-preference-settings__field">
          <span>{language === 'en' ? 'Name' : 'Nome'}</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            disabled={busy}
          />
        </label>
        <label className="newsletter-preference-settings__field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={busy}
          />
        </label>
      </div>

      <label className="newsletter-preference-settings__privacy">
        <input
          type="checkbox"
          checked={privacyAccepted}
          disabled={busy || subscribed}
          onChange={(e) => setPrivacyAccepted(e.target.checked)}
        />
        <span>
          {language === 'en' ? (
            <>
              I agree to receive marketing emails and have read the{' '}
              <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer">
                privacy policy
              </a>
              .
            </>
          ) : (
            <>
              Accetto di ricevere email di marketing e ho letto l&apos;
              <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer">
                informativa privacy
              </a>
              .
            </>
          )}
        </span>
      </label>

      {error && <p className="newsletter-preference-settings__error">{error}</p>}

      {subscribed ? (
        <div className="newsletter-preference-settings__actions">
          <p className="newsletter-preference-settings__status">
            {language === 'en' ? 'You are subscribed to the newsletter.' : 'Sei iscritto alla newsletter.'}
          </p>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void unsubscribe()}>
            {busy
              ? (language === 'en' ? 'Saving…' : 'Salvataggio…')
              : (language === 'en' ? 'Unsubscribe' : 'Disiscriviti')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-primary newsletter-preference-settings__submit"
          disabled={busy}
          onClick={() => void subscribe()}
        >
          {busy
            ? (language === 'en' ? 'Subscribing…' : 'Iscrizione…')
            : (language === 'en' ? 'Subscribe to newsletter' : 'Iscriviti alla newsletter')}
        </button>
      )}
    </div>
  );
};
