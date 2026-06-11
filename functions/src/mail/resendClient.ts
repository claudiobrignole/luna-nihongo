const RESEND_API = 'https://api.resend.com/emails';

export const DEFAULT_FROM = 'Luna Nihongo <luna@brignole.ch>';

export interface SendResendEmailInput {
  apiKey: string;
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendResendEmail(input: SendResendEmailInput): Promise<void> {
  const key = input.apiKey?.trim();
  if (!key) {
    console.warn('Resend: RESEND_API_KEY not configured, skipping email');
    return;
  }

  const from = input.from?.trim() || process.env.RESEND_FROM?.trim() || DEFAULT_FROM;

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('Resend API error', res.status, body.slice(0, 500));
    throw new Error(`Resend failed (${res.status})`);
  }
}
