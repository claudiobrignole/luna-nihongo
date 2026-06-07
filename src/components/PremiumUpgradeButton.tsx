import React, { useState } from 'react';
import { Crown, Loader2 } from 'lucide-react';
import { startPremiumCheckout } from '../services/stripeService';

interface PremiumUpgradeButtonProps {
  language: 'en' | 'it';
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}

export const PremiumUpgradeButton: React.FC<PremiumUpgradeButtonProps> = ({
  language,
  className = 'btn btn-primary',
  style,
  label,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultLabel = language === 'en' ? 'Upgrade to Premium' : 'Passa a Premium';

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = await startPremiumCheckout(language);
      window.location.href = url;
    } catch (err) {
      console.error('Stripe checkout failed', err);
      setError(
        language === 'en'
          ? 'Could not start checkout. Try again or contact support.'
          : 'Impossibile avviare il pagamento. Riprova o contattaci.',
      );
      setLoading(false);
    }
  };

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'stretch' }}>
      <button
        type="button"
        className={className}
        style={style}
        disabled={loading}
        onClick={() => void handleClick()}
      >
        {loading ? <Loader2 size={16} className="spin" /> : <Crown size={16} />}
        {label ?? defaultLabel}
      </button>
      {error && <span style={{ fontSize: '0.72rem', color: 'var(--error)' }}>{error}</span>}
    </span>
  );
};
