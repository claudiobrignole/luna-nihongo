import type { ChatMessage } from '../types/user';

export const MAX_CHAT_HISTORY = 400;
const PROMPT_CONTEXT_MAX_CHARS = 8000;

export interface LiveSessionSummary {
  id: string;
  startedAt: string;
  label: string;
  messageCount: number;
  preview: string;
}

function formatSessionDate(date: Date, language: 'en' | 'it'): string {
  return date.toLocaleDateString(language === 'en' ? 'en-GB' : 'it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatSessionTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function formatLiveSessionDivider(language: 'en' | 'it', date = new Date()): string {
  const d = formatSessionDate(date, language);
  const t = formatSessionTime(date);
  return language === 'en'
    ? `Live session · ${d} · ${t}`
    : `Sessione live · ${d} · ${t}`;
}

export function listLiveSessions(chatHistory: ChatMessage[]): LiveSessionSummary[] {
  const sessions: LiveSessionSummary[] = [];

  for (const msg of chatHistory) {
    if (!msg.sessionDivider || !msg.liveSessionId) continue;
    const startedAt = msg.createdAt ?? new Date().toISOString();
    const messages = chatHistory.filter(
      (m) => m.liveSessionId === msg.liveSessionId && !m.sessionDivider,
    );
    const preview = messages
      .slice(0, 3)
      .map((m) => m.content)
      .join(' ')
      .slice(0, 120);

    sessions.push({
      id: msg.liveSessionId,
      startedAt,
      label: msg.content,
      messageCount: messages.length,
      preview,
    });
  }

  return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function getLiveSessionMessages(
  chatHistory: ChatMessage[],
  liveSessionId: string,
): ChatMessage[] {
  return chatHistory.filter(
    (m) => m.liveSessionId === liveSessionId && !m.sessionDivider,
  );
}

export function filterLiveSessions(
  sessions: LiveSessionSummary[],
  filters: { month?: string; day?: number; text?: string },
  chatHistory: ChatMessage[],
): LiveSessionSummary[] {
  let result = sessions;

  if (filters.month) {
    result = result.filter((s) => s.startedAt.slice(0, 7) === filters.month);
  }

  if (filters.day !== undefined && filters.day > 0) {
    result = result.filter((s) => new Date(s.startedAt).getDate() === filters.day);
  }

  const query = filters.text?.trim().toLowerCase();
  if (query) {
    result = result.filter((session) => {
      if (session.label.toLowerCase().includes(query)) return true;
      if (session.preview.toLowerCase().includes(query)) return true;
      return getLiveSessionMessages(chatHistory, session.id).some((m) =>
        m.content.toLowerCase().includes(query),
      );
    });
  }

  return result;
}

export function buildChatContextForPrompt(
  chatHistory: ChatMessage[],
  maxChars = PROMPT_CONTEXT_MAX_CHARS,
): string {
  const lines: string[] = [];
  let chars = 0;

  for (let i = chatHistory.length - 1; i >= 0; i--) {
    const msg = chatHistory[i];
    if (msg.sessionDivider) continue;
    const channel = msg.source === 'live' ? 'live' : 'chat';
    const line = `[${channel}] ${msg.role}: ${msg.content}`;
    if (chars + line.length > maxChars) break;
    lines.unshift(line);
    chars += line.length;
  }

  return lines.length > 0 ? lines.join('\n') : '(no prior conversation)';
}

export function trimChatHistory(chatHistory: ChatMessage[]): ChatMessage[] {
  if (chatHistory.length <= MAX_CHAT_HISTORY) return chatHistory;
  return chatHistory.slice(-MAX_CHAT_HISTORY);
}
