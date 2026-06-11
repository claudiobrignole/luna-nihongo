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
