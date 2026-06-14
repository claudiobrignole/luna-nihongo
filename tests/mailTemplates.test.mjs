import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTransactionalEmail } from '../functions/lib/mail/templates.js';

test('booking_confirmed email includes meet link and subject', () => {
  const { subject, html } = buildTransactionalEmail('en', {
    type: 'booking_confirmed',
    data: {
      name: 'Alex',
      date: '2026-06-10',
      time: '14:30 – 15:30',
      meetLink: 'https://lunanihongo.com/call/luna-abc',
      plan: 'Included',
    },
  });

  assert.match(subject, /confirmed/i);
  assert.match(html, /Alex/);
  assert.match(html, /https:\/\/lunanihongo\.com\/call\/luna-abc/);
});

test('booking_rescheduled email shows old and new times', () => {
  const { subject, html } = buildTransactionalEmail('it', {
    type: 'booking_rescheduled',
    data: {
      name: 'Marco',
      oldDate: '2026-06-05',
      oldTime: '10:00 – 11:00',
      date: '2026-06-12',
      time: '18:00 – 19:00',
      meetLink: 'https://lunanihongo.com/call/luna-xyz',
    },
  });

  assert.match(subject, /riprogrammata/i);
  assert.match(html, /2026-06-05/);
  assert.match(html, /2026-06-12/);
});

test('booking_cancelled_forfeit email mentions forfeited credit', () => {
  const { subject, html } = buildTransactionalEmail('it', {
    type: 'booking_cancelled_forfeit',
    data: {
      name: 'Marco',
      date: '2026-06-10',
      time: '14:30 – 15:30',
      meetLink: '',
    },
  });

  assert.match(subject, /credito esaurito/i);
  assert.match(html, /non verrà rimborsata/i);
});

test('booking_cancelled_grace email mentions rebook', () => {
  const { html } = buildTransactionalEmail('en', {
    type: 'booking_cancelled_grace',
    data: {
      name: 'Alex',
      date: '2026-06-10',
      time: '14:30 – 15:30',
      meetLink: '',
    },
  });

  assert.match(html, /without penalty/i);
  assert.match(html, /60 days/i);
});

test('lesson_cancelled_by_luna email includes discount code', () => {
  const { html } = buildTransactionalEmail('it', {
    type: 'lesson_cancelled_by_luna',
    data: {
      name: 'Marco',
      date: '2026-06-10',
      time: '14:30 – 15:30',
      meetLink: '',
      reason: 'Imprevisto',
      discountCode: 'LUNA-ABCD-EFGH',
      discountPercent: 20,
      bookingUrl: 'https://lunanihongo.com/?book=regular',
    },
  });

  assert.match(html, /LUNA-ABCD-EFGH/);
  assert.match(html, /20%/);
});

test('coupon_no_slots_auto email includes coupon code', () => {
  const { html } = buildTransactionalEmail('en', {
    type: 'coupon_no_slots_auto',
    data: {
      name: 'Alex',
      couponCode: 'LUNA-1234-5678',
      bookingUrl: 'https://lunanihongo.com/?book=regular',
    },
  });

  assert.match(html, /LUNA-1234-5678/);
});

test('gift_coupon_purchased email includes shareable code', () => {
  const { subject, html } = buildTransactionalEmail('it', {
    type: 'gift_coupon_purchased',
    data: {
      name: 'Marco',
      couponCode: 'LUNA-GIFT-CODE',
      bookingUrl: 'https://lunanihongo.com/?book=regular',
    },
  });

  assert.match(subject, /regalo/i);
  assert.match(html, /LUNA-GIFT-CODE/);
  assert.match(html, /Condividi il codice/i);
});

test('lesson_reminder_day_before email includes meet link', () => {
  const { subject, html } = buildTransactionalEmail('it', {
    type: 'lesson_reminder_day_before',
    data: {
      name: 'Marco',
      date: '2026-06-10',
      time: '14:30 – 15:30',
      meetLink: 'https://lunanihongo.com/call/luna-rem',
    },
  });

  assert.match(subject, /36 ore/i);
  assert.match(html, /luna-rem/);
});

test('lesson_reminder_ten_min email urges join', () => {
  const { subject, html } = buildTransactionalEmail('en', {
    type: 'lesson_reminder_ten_min',
    data: {
      name: 'Alex',
      date: '2026-06-10',
      time: '14:30 – 15:30',
      meetLink: 'https://meet.google.com/abc-defg-hij',
    },
  });

  assert.match(subject, /1 hour/i);
  assert.match(html, /Open video call/);
});

test('trial_started email mentions trial days', () => {
  const { html } = buildTransactionalEmail('en', {
    type: 'trial_started',
    data: {
      name: 'Sam',
      trialDays: 7,
      trialEndsAt: 'June 11, 2026',
      bookingUrl: 'https://lunanihongo.com/?book=intro',
    },
  });

  assert.match(html, /7-day/);
  assert.match(html, /book=intro/);
});
