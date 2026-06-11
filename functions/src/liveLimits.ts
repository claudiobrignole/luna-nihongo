export const AI_MINUTES_WEEKLY = 120;
export const MAX_LIVE_SESSION_MINUTES = 10;
export const AI_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const INCLUDED_LESSONS_PER_CYCLE = 2;

export const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

export const LIVE_MODEL_FALLBACKS = [
  'gemini-2.5-flash-native-audio-preview-12-2025',
  'gemini-2.0-flash-live-001',
];

export function weeklyAiLimit(): number {
  return AI_MINUTES_WEEKLY;
}

export function normalizeWeeklyAiUsage(
  liveMinutesUsed: number | undefined,
  liveMinutesWindowStart: string | undefined | null,
  now = Date.now(),
): { used: number; windowStart: string; reset: boolean } {
  if (!liveMinutesWindowStart) {
    return { used: 0, windowStart: new Date(now).toISOString(), reset: true };
  }
  const startMs = new Date(liveMinutesWindowStart).getTime();
  if (Number.isNaN(startMs) || now - startMs >= AI_WEEK_MS) {
    return { used: 0, windowStart: new Date(now).toISOString(), reset: true };
  }
  return { used: liveMinutesUsed ?? 0, windowStart: liveMinutesWindowStart, reset: false };
}
