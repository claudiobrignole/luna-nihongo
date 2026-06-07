import React from 'react';
import { Clock } from 'lucide-react';
import type { LunaUser } from '../types/user';
import { formatPremiumHistoryPurgeDate } from '../utils/premiumRetention';

interface PremiumRetentionNoticeProps {
  language: 'en' | 'it';
  currentUser: LunaUser;
}

export const PremiumRetentionNotice: React.FC<PremiumRetentionNoticeProps> = ({
  language,
  currentUser,
}) => {
  if (currentUser.tier !== 'free' || !currentUser.premiumEndedAt) {
    return null;
  }

  const purgeDate = formatPremiumHistoryPurgeDate(currentUser.premiumEndedAt, language);

  return (
    <div className="glass-panel premium-retention-notice">
      <Clock size={16} />
      <p>
        {language === 'en'
          ? `Your saved live conversations will be removed on ${purgeDate} (90 days after Premium ended).`
          : `Le conversazioni live salvate verranno eliminate il ${purgeDate} (90 giorni dopo la fine del Premium).`}
      </p>
    </div>
  );
};
