#!/usr/bin/env node
/**
 * Stripe + Cloud Functions readiness checklist for Luna Nihongo.
 * Run from repo root: node scripts/check-stripe-setup.mjs
 */
const PROJECT = 'luna-nihongo';
const REGION = 'europe-west1';
// Firebase v2 HTTPS callables use camelCase in the cloudfunctions.net URL.
const CALLABLES = [
  'createStripeCheckout',
  'createExtraLessonCheckout',
  'createStripePortal',
];
const WEBHOOK = `https://${REGION}-${PROJECT}.cloudfunctions.net/stripeWebhook`;

async function probeCallable(name) {
  const url = `https://${REGION}-${PROJECT}.cloudfunctions.net/${name}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { language: 'it' } }),
    });
    const text = await res.text();
    // Unauthenticated callable → 401/403 with Firebase error (service reachable).
    const reachable =
      res.status === 401 ||
      res.status === 403 ||
      text.includes('UNAUTHENTICATED') ||
      text.includes('Login required');
    return { name, url, status: res.status, reachable, snippet: text.slice(0, 120) };
  } catch (err) {
    return { name, url, status: 0, reachable: false, snippet: String(err.message ?? err) };
  }
}

async function probeWebhook() {
  try {
    const res = await fetch(WEBHOOK, { method: 'GET' });
    return { status: res.status, reachable: res.status === 405 || res.status === 400 };
  } catch (err) {
    return { status: 0, reachable: false, error: String(err.message ?? err) };
  }
}

console.log('Luna Nihongo — Stripe setup checklist\n');
console.log('1. Firebase secrets (run locally after firebase login):');
console.log('   firebase functions:secrets:set STRIPE_SECRET_KEY');
console.log('   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET');
console.log('2. Function params (Firebase Console → Functions → createStripeCheckout → Parameters):');
console.log('   STRIPE_PRICE_ID = price_...  (monthly subscription, NOT prod_...)');
console.log('   STRIPE_EXTRA_LESSON_PRICE_ID = price_...  (optional, has default in code)');
console.log('3. Stripe Dashboard → Webhooks → endpoint:');
console.log(`   ${WEBHOOK}`);
console.log('   Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted');
console.log('4. After deploy, grant public invoker on Cloud Run:');
console.log('   npm run functions:allow-public:gcloud');
console.log('');

console.log('Probing Cloud Run endpoints (no auth)…\n');

const results = await Promise.all(CALLABLES.map(probeCallable));
for (const r of results) {
  const icon = r.reachable ? '✓' : '✗';
  console.log(`${icon} ${r.name} → HTTP ${r.status}${r.reachable ? ' (reachable)' : ' (check IAM / deploy)'}`);
  if (!r.reachable) console.log(`    ${r.snippet}`);
}

const wh = await probeWebhook();
const whIcon = wh.reachable ? '✓' : '✗';
console.log(`${whIcon} stripeWebhook → HTTP ${wh.status}${wh.reachable ? ' (reachable)' : ' (check deploy)'}`);

console.log('\nManual test: sign in → Luna → Abbonati con Stripe → pay (test mode) → popup prenotazione.');
