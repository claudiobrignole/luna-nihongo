export const FREE_LIVE_MINUTES_MONTHLY = 5;
export const PREMIUM_LIVE_MINUTES_MONTHLY = 120;
export const MAX_LIVE_SESSION_MINUTES = 10;

export const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

/** Tried in order if the primary model rejects token creation. */
export const LIVE_MODEL_FALLBACKS = [
  'gemini-2.5-flash-native-audio-preview-12-2025',
  'gemini-2.0-flash-live-001',
];

export function currentPeriod(): string {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${now.getUTCFullYear()}-${month}`;
}

export function monthlyLimit(tier: 'free' | 'premium'): number {
  return tier === 'premium' ? PREMIUM_LIVE_MINUTES_MONTHLY : FREE_LIVE_MINUTES_MONTHLY;
}

export function normalizeLiveUsage(
  liveMinutesUsed: number | undefined,
  liveMinutesPeriod: string | undefined,
): { used: number; period: string } {
  const period = currentPeriod();
  if (liveMinutesPeriod !== period) {
    return { used: 0, period };
  }
  return { used: liveMinutesUsed ?? 0, period };
}
