export type MailLanguage = 'it' | 'en';

export type TransactionalMailType =
  | 'booking_confirmed'
  | 'booking_link_added'
  | 'booking_link_added_teacher'
  | 'teacher_booking_new'
  | 'teacher_add_link_reminder'
  | 'booking_cancelled'
  | 'booking_cancelled_grace'
  | 'booking_cancelled_forfeit'
  | 'booking_rescheduled'
  | 'lesson_cancelled_by_luna'
  | 'coupon_no_slots_auto'
  | 'gift_coupon_purchased'
  | 'lesson_reminder_day_before'
  | 'lesson_reminder_ten_min'
  | 'lesson_reminder_36h'
  | 'lesson_reminder_1h'
  | 'lesson_reminder_36h_teacher'
  | 'lesson_reminder_1h_teacher'
  | 'premium_welcome'
  | 'trial_started';

export interface BookingMailData {
  name: string;
  date: string;
  time: string;
  meetLink?: string | null;
  plan?: string;
  teacherName?: string;
}

export interface TeacherMailData {
  teacherName: string;
  studentName: string;
  studentEmail?: string;
  date: string;
  time: string;
  meetLink?: string | null;
  plan?: string;
  dashboardUrl?: string;
}

export interface LinkAddedMailData extends BookingMailData {
  teacherName: string;
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

export interface LunaCancelMailData extends BookingMailData {
  reason?: string;
  discountCode: string;
  discountPercent: number;
  bookingUrl: string;
}

export interface CouponNoSlotsMailData {
  name: string;
  couponCode: string;
  bookingUrl: string;
}

type MailPayload =
  | { type: 'booking_confirmed'; data: BookingMailData }
  | { type: 'booking_link_added'; data: LinkAddedMailData }
  | { type: 'booking_link_added_teacher'; data: TeacherMailData }
  | { type: 'teacher_booking_new'; data: TeacherMailData }
  | { type: 'teacher_add_link_reminder'; data: TeacherMailData }
  | { type: 'booking_cancelled'; data: BookingMailData }
  | { type: 'booking_cancelled_grace'; data: BookingMailData }
  | { type: 'booking_cancelled_forfeit'; data: BookingMailData }
  | { type: 'booking_rescheduled'; data: RescheduleMailData }
  | { type: 'lesson_cancelled_by_luna'; data: LunaCancelMailData }
  | { type: 'coupon_no_slots_auto'; data: CouponNoSlotsMailData }
  | { type: 'gift_coupon_purchased'; data: CouponNoSlotsMailData }
  | { type: 'lesson_reminder_day_before'; data: BookingMailData }
  | { type: 'lesson_reminder_ten_min'; data: BookingMailData }
  | { type: 'lesson_reminder_36h'; data: BookingMailData }
  | { type: 'lesson_reminder_1h'; data: BookingMailData }
  | { type: 'lesson_reminder_36h_teacher'; data: TeacherMailData }
  | { type: 'lesson_reminder_1h_teacher'; data: TeacherMailData }
  | { type: 'premium_welcome'; data: PremiumWelcomeData }
  | { type: 'trial_started'; data: TrialStartedData };

function meetLinkHtml(meetLink: string | null | undefined, it: boolean): string {
  const link = String(meetLink ?? '').trim();
  if (!link) {
    return `<p style="font-size:14px;color:#666">${it
      ? 'Riceverai il link video appena il maestro lo inserirà.'
      : 'You will receive the video link once your teacher adds it.'}</p>`;
  }
  return `<p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#9b59b6;color:#fff;text-decoration:none;border-radius:8px">${it ? 'Apri videochiamata' : 'Open video call'}</a></p>`;
}

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
      const { name, date, time, meetLink, plan, teacherName } = payload.data;
      return {
        subject: it ? 'Lezione confermata — Luna Nihongo' : 'Lesson confirmed — Luna Nihongo',
        html: wrapHtml(`
          <h2>${it ? `Ciao ${name}!` : `Hi ${name}!`}</h2>
          <p>${it
            ? `La tua lezione con ${teacherName ?? 'il maestro'} è confermata.`
            : `Your lesson with ${teacherName ?? 'your teacher'} is confirmed.`}</p>
          <p><strong>${it ? 'Data' : 'Date'}:</strong> ${date}<br/>
          <strong>${it ? 'Orario' : 'Time'}:</strong> ${time}</p>
          ${plan ? `<p><strong>${it ? 'Piano' : 'Plan'}:</strong> ${plan}</p>` : ''}
          ${meetLinkHtml(meetLink, it)}
        `),
      };
    }
    case 'booking_link_added': {
      const { name, date, time, meetLink, teacherName } = payload.data;
      return {
        subject: it ? 'Link video lezione — Luna Nihongo' : 'Lesson video link — Luna Nihongo',
        html: wrapHtml(`
          <h2>${it ? `Ciao ${name}!` : `Hi ${name}!`}</h2>
          <p>${it
            ? `${teacherName ?? 'Il tuo maestro'} ha inserito il link per la videochiamata.`
            : `${teacherName ?? 'Your teacher'} added the video call link.`}</p>
          <p><strong>${date}</strong> · ${time}</p>
          ${meetLinkHtml(meetLink, it)}
        `),
      };
    }
    case 'booking_link_added_teacher':
    case 'teacher_booking_new':
    case 'teacher_add_link_reminder': {
      const { teacherName, studentName, studentEmail, date, time, dashboardUrl } = payload.data;
      const isNew = payload.type === 'teacher_booking_new';
      const isReminder = payload.type === 'teacher_add_link_reminder';
      return {
        subject: isReminder
          ? (it ? 'Inserisci il link video — Luna Nihongo' : 'Add the video link — Luna Nihongo')
          : isNew
            ? (it ? 'Nuova prenotazione lezione' : 'New lesson booking')
            : (it ? 'Link video salvato' : 'Video link saved'),
        html: wrapHtml(`
          <h2>${it ? `Ciao ${teacherName}!` : `Hi ${teacherName}!`}</h2>
          <p>${isReminder
            ? (it
              ? `Manca il link video per la lezione con ${studentName} (${date} · ${time}). Inseriscilo nella dashboard.`
              : `The video link is missing for your lesson with ${studentName} (${date} · ${time}). Add it in your dashboard.`)
            : isNew
              ? (it
                ? `Hai una nuova prenotazione con ${studentName}${studentEmail ? ` (${studentEmail})` : ''}.`
                : `You have a new booking with ${studentName}${studentEmail ? ` (${studentEmail})` : ''}.`)
              : (it ? 'Link video salvato correttamente.' : 'Video link saved successfully.')}</p>
          <p><strong>${date}</strong> · ${time}</p>
          ${isNew || isReminder ? `<p><a href="${dashboardUrl ?? 'https://lunanihongo.com'}" style="display:inline-block;padding:12px 20px;background:#9b59b6;color:#fff;text-decoration:none;border-radius:8px">${it ? 'Vai alla dashboard maestro' : 'Go to teacher dashboard'}</a></p>` : ''}
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
    case 'booking_cancelled_grace': {
      const { name, date, time } = payload.data;
      return {
        subject: it
          ? 'Lezione annullata — puoi riprenotare'
          : 'Lesson cancelled — you can rebook',
        html: wrapHtml(`
          <h2>${it ? `Ciao ${name}` : `Hi ${name}`}</h2>
          <p>${it
            ? 'Hai annullato la lezione senza penale (1 volta per ciclo di abbonamento). Puoi riprenotare un nuovo slot incluso o usare il credito extra senza pagare di nuovo.'
            : 'You cancelled without penalty (once per billing cycle). You can book another slot using your included lesson or extra rebook credit at no extra charge.'}</p>
          <p><strong>${date}</strong> · ${time}</p>
          <p style="font-size:14px;color:#666">${it
            ? 'Se non trovi slot disponibili, il sistema ti invierà un coupon per prenotare entro 60 giorni.'
            : 'If no slots are available, the system will issue a coupon so you can book within 60 days.'}</p>
        `),
      };
    }
    case 'booking_cancelled_forfeit': {
      const { name, date, time } = payload.data;
      return {
        subject: it
          ? 'Lezione annullata — credito esaurito'
          : 'Lesson cancelled — credit forfeited',
        html: wrapHtml(`
          <h2>${it ? `Ciao ${name}` : `Hi ${name}`}</h2>
          <p>${it
            ? 'Hai già usato la cancellazione senza penale in questo ciclo. Questa lezione è persa e non verrà rimborsata.'
            : 'You already used your penalty-free cancellation this billing cycle. This lesson is forfeited and will not be refunded.'}</p>
          <p><strong>${date}</strong> · ${time}</p>
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
          ${meetLinkHtml(meetLink, it)}
        `),
      };
    }
    case 'lesson_cancelled_by_luna': {
      const { name, date, time, reason, discountCode, discountPercent, bookingUrl } = payload.data;
      return {
        subject: it
          ? 'Lezione annullata da Luna — riprenota'
          : 'Lesson cancelled by Luna — rebook',
        html: wrapHtml(`
          <h2>${it ? `Ciao ${name}` : `Hi ${name}`}</h2>
          <p>${it
            ? 'Luna ha dovuto annullare la tua lezione. Puoi prenotarne un\'altra quando vuoi, anche se l\'abbonamento sta terminando.'
            : 'Luna had to cancel your lesson. You can book another one anytime, even if your subscription is ending.'}</p>
          <p><strong>${date}</strong> · ${time}</p>
          ${reason ? `<p style="font-size:14px;color:#666">${reason}</p>` : ''}
          <p>${it
            ? `In omaggio: <strong>${discountPercent}% di sconto</strong> su una lezione extra (codice <strong>${discountCode}</strong>, valido 60 giorni).`
            : `As a courtesy: <strong>${discountPercent}% off</strong> an extra lesson (code <strong>${discountCode}</strong>, valid 60 days).`}</p>
          <p><a href="${bookingUrl}" style="display:inline-block;padding:12px 20px;background:#9b59b6;color:#fff;text-decoration:none;border-radius:8px">${it ? 'Prenota di nuovo' : 'Book again'}</a></p>
        `),
      };
    }
    case 'coupon_no_slots_auto': {
      const { name, couponCode, bookingUrl } = payload.data;
      return {
        subject: it
          ? 'Coupon lezione — nessuno slot disponibile'
          : 'Lesson coupon — no slots available',
        html: wrapHtml(`
          <h2>${it ? `Ciao ${name}` : `Hi ${name}`}</h2>
          <p>${it
            ? 'Non ci sono slot liberi nei prossimi 30 giorni. Ti abbiamo emesso un coupon per prenotare una lezione entro 60 giorni, anche se l\'abbonamento è scaduto.'
            : 'There are no open slots in the next 30 days. We issued a coupon so you can book within 60 days, even if your subscription has ended.'}</p>
          <p>${it ? 'Codice coupon' : 'Coupon code'}: <strong>${couponCode}</strong></p>
          <p><a href="${bookingUrl}" style="display:inline-block;padding:12px 20px;background:#9b59b6;color:#fff;text-decoration:none;border-radius:8px">${it ? 'Prenota lezione' : 'Book a lesson'}</a></p>
        `),
      };
    }
    case 'gift_coupon_purchased': {
      const { name, couponCode, bookingUrl } = payload.data;
      return {
        subject: it
          ? 'Il tuo coupon regalo Luna è pronto'
          : 'Your Luna gift coupon is ready',
        html: wrapHtml(`
          <h2>${it ? `Grazie${name ? `, ${name}` : ''}!` : `Thank you${name ? `, ${name}` : ''}!`}</h2>
          <p>${it
            ? 'Hai acquistato un coupon regalo per una lezione live da 60 minuti con Luna. Condividi il codice con chi vuoi: può riscattarlo dal profilo e prenotare anche senza abbonamento attivo.'
            : 'You purchased a gift coupon for a 60-minute live lesson with Luna. Share the code with anyone — they can redeem it from their profile and book even without an active subscription.'}</p>
          <p>${it ? 'Codice regalo' : 'Gift code'}: <strong>${couponCode}</strong></p>
          <p>${it ? 'Valido 60 giorni dall\'acquisto (chi riscatta deve prenotare entro la scadenza).' : 'Valid for 60 days from purchase (the recipient must book before it expires).'}</p>
          <p><a href="${bookingUrl}" style="display:inline-block;padding:12px 20px;background:#9b59b6;color:#fff;text-decoration:none;border-radius:8px">${it ? 'Vai a Luna Nihongo' : 'Go to Luna Nihongo'}</a></p>
        `),
      };
    }
    case 'lesson_reminder_day_before':
    case 'lesson_reminder_36h': {
      const { name, date, time, meetLink, teacherName } = payload.data;
      return {
        subject: it
          ? 'Promemoria: lezione tra 36 ore'
          : 'Reminder: lesson in 36 hours',
        html: wrapHtml(`
          <h2>${it ? `Ciao ${name}!` : `Hi ${name}!`}</h2>
          <p>${it
            ? `Tra circa 36 ore hai una lezione${teacherName ? ` con ${teacherName}` : ''}.`
            : `You have a lesson${teacherName ? ` with ${teacherName}` : ''} in about 36 hours.`}</p>
          <p><strong>${date}</strong> · ${time}</p>
          ${meetLinkHtml(meetLink, it)}
        `),
      };
    }
    case 'lesson_reminder_36h_teacher': {
      const { teacherName, studentName, date, time, meetLink } = payload.data;
      return {
        subject: it ? 'Promemoria lezione tra 36 ore' : 'Lesson reminder — 36 hours',
        html: wrapHtml(`
          <h2>${it ? `Ciao ${teacherName}!` : `Hi ${teacherName}!`}</h2>
          <p>${it
            ? `Tra circa 36 ore hai una lezione con ${studentName}.`
            : `You have a lesson with ${studentName} in about 36 hours.`}</p>
          <p><strong>${date}</strong> · ${time}</p>
          ${meetLinkHtml(meetLink, it)}
        `),
      };
    }
    case 'lesson_reminder_ten_min':
    case 'lesson_reminder_1h': {
      const { name, date, time, meetLink, teacherName } = payload.data;
      return {
        subject: it
          ? 'La lezione inizia tra circa 1 ora'
          : 'Your lesson starts in about 1 hour',
        html: wrapHtml(`
          <h2>${it ? `Ciao ${name}!` : `Hi ${name}!`}</h2>
          <p>${it
            ? `La tua lezione${teacherName ? ` con ${teacherName}` : ''} inizia tra circa un'ora.`
            : `Your lesson${teacherName ? ` with ${teacherName}` : ''} starts in about one hour.`}</p>
          <p><strong>${date}</strong> · ${time}</p>
          ${meetLinkHtml(meetLink, it)}
        `),
      };
    }
    case 'lesson_reminder_1h_teacher': {
      const { teacherName, studentName, date, time, meetLink } = payload.data;
      return {
        subject: it ? 'Lezione tra 1 ora' : 'Lesson in 1 hour',
        html: wrapHtml(`
          <h2>${it ? `Ciao ${teacherName}!` : `Hi ${teacherName}!`}</h2>
          <p>${it
            ? `Tra circa un'ora hai una lezione con ${studentName}.`
            : `You have a lesson with ${studentName} in about one hour.`}</p>
          <p><strong>${date}</strong> · ${time}</p>
          ${meetLinkHtml(meetLink, it)}
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
