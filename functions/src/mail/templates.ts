export type MailLanguage = 'it' | 'en';

export type TransactionalMailType =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_rescheduled'
  | 'premium_welcome'
  | 'trial_started';

export interface BookingMailData {
  name: string;
  date: string;
  time: string;
  meetLink: string;
  plan?: string;
}

export interface RescheduleMailData extends BookingMailData {
  oldDate: string;
  oldTime: string;
}

export interface PremiumWelcomeData {
  name: string;
  bookingUrl: string;
}

export interface TrialStartedData {
  name: string;
  trialDays: number;
  trialEndsAt: string;
  bookingUrl: string;
}

type MailPayload =
  | { type: 'booking_confirmed'; data: BookingMailData }
  | { type: 'booking_cancelled'; data: BookingMailData }
  | { type: 'booking_rescheduled'; data: RescheduleMailData }
  | { type: 'premium_welcome'; data: PremiumWelcomeData }
  | { type: 'trial_started'; data: TrialStartedData };

function wrapHtml(body: string): string {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px">${body}<p style="margin-top:2rem;font-size:12px;color:#666">Luna Nihongo · <a href="https://lunanihongo.com">lunanihongo.com</a></p></body></html>`;
}

export function buildTransactionalEmail(
  language: MailLanguage,
  payload: MailPayload,
): { subject: string; html: string } {
  const it = language === 'it';

  switch (payload.type) {
    case 'booking_confirmed': {
      const { name, date, time, meetLink, plan } = payload.data;
      return {
        subject: it ? 'Lezione confermata — Luna Nihongo' : 'Lesson confirmed — Luna Nihongo',
        html: wrapHtml(`
          <h2>${it ? `Ciao ${name}!` : `Hi ${name}!`}</h2>
          <p>${it ? 'La tua lezione con Luna è confermata.' : 'Your lesson with Luna is confirmed.'}</p>
          <p><strong>${it ? 'Data' : 'Date'}:</strong> ${date}<br/>
          <strong>${it ? 'Orario' : 'Time'}:</strong> ${time}</p>
          ${plan ? `<p><strong>${it ? 'Piano' : 'Plan'}:</strong> ${plan}</p>` : ''}
          <p><a href="${meetLink}" style="display:inline-block;padding:12px 20px;background:#9b59b6;color:#fff;text-decoration:none;border-radius:8px">${it ? 'Entra nel Meet' : 'Join Google Meet'}</a></p>
        `),
      };
    }
    case 'booking_cancelled': {
      const { name, date, time } = payload.data;
      return {
        subject: it ? 'Lezione annullata — Luna Nihongo' : 'Lesson cancelled — Luna Nihongo',
        html: wrapHtml(`
          <h2>${it ? `Ciao ${name}` : `Hi ${name}`}</h2>
          <p>${it ? 'La tua lezione è stata annullata.' : 'Your lesson has been cancelled.'}</p>
          <p><strong>${date}</strong> · ${time}</p>
          <p style="font-size:14px;color:#666">${it ? 'Puoi prenotare un nuovo slot dalla dashboard.' : 'You can book a new slot from your dashboard.'}</p>
        `),
      };
    }
    case 'booking_rescheduled': {
      const { name, oldDate, oldTime, date, time, meetLink } = payload.data;
      return {
        subject: it ? 'Lezione riprogrammata — Luna Nihongo' : 'Lesson rescheduled — Luna Nihongo',
        html: wrapHtml(`
          <h2>${it ? `Ciao ${name}` : `Hi ${name}`}</h2>
          <p>${it ? 'La tua lezione è stata riprogrammata.' : 'Your lesson has been rescheduled.'}</p>
          <p style="text-decoration:line-through;color:#888">${oldDate} · ${oldTime}</p>
          <p><strong>${date}</strong> · ${time}</p>
          <p><a href="${meetLink}" style="display:inline-block;padding:12px 20px;background:#9b59b6;color:#fff;text-decoration:none;border-radius:8px">${it ? 'Nuovo link Meet' : 'New Meet link'}</a></p>
        `),
      };
    }
    case 'premium_welcome': {
      const { name, bookingUrl } = payload.data;
      return {
        subject: it ? 'Benvenuto in Premium — Luna Nihongo' : 'Welcome to Premium — Luna Nihongo',
        html: wrapHtml(`
          <h2>${it ? `Benvenuto, ${name}!` : `Welcome, ${name}!`}</h2>
          <p>${it
            ? 'Il tuo abbonamento Premium è attivo. Hai 2 lezioni live incluse per ciclo di fatturazione, tutor AI illimitato e memoria a lungo termine.'
            : 'Your Premium subscription is active. You get 2 included live lessons per billing cycle, unlimited AI tutor, and long-term memory.'}</p>
          <p><a href="${bookingUrl}" style="display:inline-block;padding:12px 20px;background:#9b59b6;color:#fff;text-decoration:none;border-radius:8px">${it ? 'Prenota una lezione' : 'Book a lesson'}</a></p>
        `),
      };
    }
    case 'trial_started': {
      const { name, trialDays, trialEndsAt, bookingUrl } = payload.data;
      return {
        subject: it ? 'Prova gratuita attivata — Luna Nihongo' : 'Free trial started — Luna Nihongo',
        html: wrapHtml(`
          <h2>${it ? `Ciao ${name}!` : `Hi ${name}!`}</h2>
          <p>${it
            ? `La tua prova gratuita di ${trialDays} giorni è attiva (fino al ${trialEndsAt}).`
            : `Your ${trialDays}-day free trial is active (until ${trialEndsAt}).`}</p>
          <p>${it
            ? 'Prenota la videocall introduttiva gratuita con Luna.'
            : 'Book your free intro videocall with Luna.'}</p>
          <p><a href="${bookingUrl}" style="display:inline-block;padding:12px 20px;background:#9b59b6;color:#fff;text-decoration:none;border-radius:8px">${it ? 'Prenota intro call' : 'Book intro call'}</a></p>
        `),
      };
    }
    default:
      return { subject: 'Luna Nihongo', html: wrapHtml('<p>Luna Nihongo</p>') };
  }
}
