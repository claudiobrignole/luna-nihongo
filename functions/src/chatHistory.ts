/** Server-side chat history helpers (mirrors src/utils/chatHistory.ts). */

export interface ChatMessageDoc {
  role: 'user' | 'assistant';
  content: string;
  source?: 'chat' | 'live';
  liveSessionId?: string;
  createdAt?: string;
  sessionDivider?: boolean;
}

export const MAX_CHAT_HISTORY = 400;

const RETENTION_DAYS_AFTER_PREMIUM_END = 90;

function formatSessionDate(date: Date, language: 'en' | 'it'): string {
  return date.toLocaleDateString(language === 'en' ? 'en-GB' : 'it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatSessionTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatLiveSessionDivider(language: 'en' | 'it', date = new Date()): string {
  const d = formatSessionDate(date, language);
  const t = formatSessionTime(date);
  return language === 'en'
    ? `Live session · ${d} · ${t}`
    : `Sessione live · ${d} · ${t}`;
}

export function mergeLiveTranscriptIntoChatHistory(
  existing: ChatMessageDoc[],
  sessionId: string,
  transcript: Array<{ role: 'user' | 'assistant'; text: string }>,
  language: 'en' | 'it',
  sessionStartedAt = new Date(),
): ChatMessageDoc[] {
  const lines = transcript
    .map((line) => ({
      role: line.role,
      content: line.text.trim(),
    }))
    .filter((line) => line.content.length > 0);

  if (lines.length === 0) return existing;

  const createdAt = sessionStartedAt.toISOString();
  const divider: ChatMessageDoc = {
    role: 'assistant',
    content: formatLiveSessionDivider(language, sessionStartedAt),
    source: 'live',
    liveSessionId: sessionId,
    createdAt,
    sessionDivider: true,
  };

  const liveMessages: ChatMessageDoc[] = lines.map((line) => ({
    role: line.role,
    content: line.content,
    source: 'live',
    liveSessionId: sessionId,
    createdAt,
  }));

  const merged = [...existing, divider, ...liveMessages];
  if (merged.length <= MAX_CHAT_HISTORY) return merged;
  return merged.slice(-MAX_CHAT_HISTORY);
}

export function removeLiveSessionFromChatHistory(
  history: ChatMessageDoc[],
  liveSessionId: string,
): ChatMessageDoc[] {
  return history.filter((m) => m.liveSessionId !== liveSessionId);
}

export function stripAllLiveHistory(history: ChatMessageDoc[]): ChatMessageDoc[] {
  return history.filter((m) => m.source !== 'live' && !m.sessionDivider);
}

export function isPremiumHistoryExpired(premiumEndedAt: string | null | undefined): boolean {
  if (!premiumEndedAt) return false;
  const ended = new Date(premiumEndedAt).getTime();
  if (Number.isNaN(ended)) return false;
  const cutoff = Date.now() - RETENTION_DAYS_AFTER_PREMIUM_END * 24 * 60 * 60 * 1000;
  return ended < cutoff;
}

export function retentionDaysAfterPremiumEnd(): number {
  return RETENTION_DAYS_AFTER_PREMIUM_END;
}
