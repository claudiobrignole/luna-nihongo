import React, { useState } from 'react';
import { Crown, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatStripeCallableError, startPremiumCheckout } from '../services/stripeService';
import { premiumButtonLabel } from '../utils/premiumCopy';

interface PremiumUpgradeButtonProps {
  language: 'en' | 'it';
  className?: string;
  style?: React.CSSProperties;
  label?: string;
  onRequireAuth?: () => void;
}

export const PremiumUpgradeButton: React.FC<PremiumUpgradeButtonProps> = ({
  language,
  className = 'btn btn-primary',
  style,
  label,
  onRequireAuth,
}) => {
  const { firebaseUser, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (authLoading) return;
    if (!firebaseUser) {
      onRequireAuth?.();
      setError(
        language === 'en'
          ? 'Please sign in before subscribing.'
          : 'Accedi prima di passare a Premium.',
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const url = await startPremiumCheckout(language);
      window.location.href = url;
    } catch (err) {
      console.error('Stripe checkout failed', err);
      setError(formatStripeCallableError(err, language));
      setLoading(false);
    }
  };

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'stretch' }}>
      <button
        type="button"
        className={className}
        style={style}
        disabled={loading || authLoading}
        onClick={() => void handleClick()}
      >
        {loading || authLoading ? <Loader2 size={16} className="spin" /> : <Crown size={16} />}
        {label ?? premiumButtonLabel(language)}
      </button>
      {error && <span style={{ fontSize: '0.72rem', color: 'var(--error)' }}>{error}</span>}
    </span>
  );
};
