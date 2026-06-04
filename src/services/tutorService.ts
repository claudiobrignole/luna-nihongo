import type { ChatMessage } from '../types/user';
import type { TutorMode } from './tutorContext';

interface TutorReplyResponse {
  reply: string;
}

export async function fetchTutorReply(
  systemPrompt: string,
  messages: ChatMessage[],
  mode: TutorMode,
): Promise<string> {
  const response = await fetch('/api/tutor.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt,
      messages,
      maxOutputTokens: mode === 'conversation' ? 700 : 400,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tutor API error: ${response.status}`);
  }

  const data = (await response.json()) as TutorReplyResponse & { error?: string };
  if (data.error) throw new Error(data.error);
  return data.reply?.trim() ?? '';
}
