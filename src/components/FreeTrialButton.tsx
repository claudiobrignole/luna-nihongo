import React, { useState } from 'react';
import { Gift, Loader2 } from 'lucide-react';
import { startFreeTrial } from '../services/trialService';

interface FreeTrialButtonProps {
  language: 'en' | 'it';
  trialUsed?: boolean;
  hasPremium?: boolean;
  onTrialStarted: () => void | Promise<void>;
  onBookIntro: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const FreeTrialButton: React.FC<FreeTrialButtonProps> = ({
  language,
  trialUsed,
  hasPremium,
  onTrialStarted,
  onBookIntro,
  className = 'btn btn-primary',
  style,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (hasPremium) {
    return (
      <button type="button" className={className} onClick={onBookIntro}>
        {language === 'en' ? 'Book intro videocall' : 'Prenota videocall introduttiva'}
      </button>
    );
  }

  if (trialUsed) {
    return (
      <button type="button" className={className} onClick={onBookIntro}>
        {language === 'en' ? 'Book your intro call' : 'Prenota la tua call introduttiva'}
      </button>
    );
  }

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      await startFreeTrial();
      await onTrialStarted();
      onBookIntro();
    } catch (err) {
      console.error('Free trial start failed', err);
      setError(
        language === 'en'
          ? 'Could not start free trial. You may have already used it.'
          : 'Impossibile avviare la prova gratuita. Forse l\'hai già usata.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
      <button type="button" className={className} style={style} disabled={loading} onClick={() => void handleClick()}>
        {loading ? <Loader2 size={16} className="spin" /> : <Gift size={16} />}
        {language === 'en' ? 'Start free trial' : 'Inizia prova gratuita'}
      </button>
      {error && <span style={{ fontSize: '0.72rem', color: 'var(--error)' }}>{error}</span>}
    </span>
  );
};
