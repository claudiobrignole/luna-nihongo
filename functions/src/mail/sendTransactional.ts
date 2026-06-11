import {
  buildTransactionalEmail,
  type BookingMailData,
  type MailLanguage,
  type PremiumWelcomeData,
  type RescheduleMailData,
  type TransactionalMailType,
  type TrialStartedData,
} from './templates';
import { sendResendEmail } from './resendClient';

export type TransactionalMailData =
  | BookingMailData
  | RescheduleMailData
  | PremiumWelcomeData
  | TrialStartedData;

export interface SendTransactionalInput {
  apiKey: string;
  to: string;
  language: MailLanguage;
  type: TransactionalMailType;
  data: TransactionalMailData;
}

export async function sendTransactionalEmail(input: SendTransactionalInput): Promise<void> {
  const { subject, html } = buildTransactionalEmail(input.language, {
    type: input.type,
    data: input.data,
  } as Parameters<typeof buildTransactionalEmail>[1]);

  await sendResendEmail({
    apiKey: input.apiKey,
    to: input.to,
    subject,
    html,
  });
}

/** Fire-and-forget — never blocks booking flows. */
export function queueTransactionalEmail(input: SendTransactionalInput): void {
  void sendTransactionalEmail(input).catch((err) => {
    console.error(`Transactional email ${input.type} failed for ${input.to}`, err);
  });
}

export function resolveUserLanguage(user: Record<string, unknown>): MailLanguage {
  return user.preferredLanguage === 'en' ? 'en' : 'it';
}
