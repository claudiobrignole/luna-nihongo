/** Days live history is kept after Premium ends (must match functions/src/chatHistory.ts). */
export const PREMIUM_HISTORY_RETENTION_DAYS = 90;

export function premiumHistoryPurgeDate(premiumEndedAt: string): Date {
  const ended = new Date(premiumEndedAt);
  return new Date(ended.getTime() + PREMIUM_HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export function formatPremiumHistoryPurgeDate(
  premiumEndedAt: string,
  language: 'en' | 'it',
): string {
  return premiumHistoryPurgeDate(premiumEndedAt).toLocaleDateString(
    language === 'en' ? 'en-GB' : 'it-IT',
    { day: 'numeric', month: 'long', year: 'numeric' },
  );
}
