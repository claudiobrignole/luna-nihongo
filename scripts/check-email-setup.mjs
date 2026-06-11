#!/usr/bin/env node
/**
 * SendFox + Resend readiness checklist for Luna Nihongo.
 * Run from repo root: npm run check:email
 */
const PROJECT = 'luna-nihongo';
const REGION = 'europe-west1';
const CALLABLES = [
  'subscribeNewsletter',
  'syncMarketingConsent',
  'cancelBooking',
  'rescheduleBooking',
];

async function probeCallable(name) {
  const url = `https://${REGION}-${PROJECT}.cloudfunctions.net/${name}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { email: 'test@example.com', language: 'it' } }),
    });
    const text = await res.text();
    const reachable =
      res.status === 401 ||
      res.status === 403 ||
      res.status === 400 ||
      text.includes('UNAUTHENTICATED') ||
      text.includes('Login required') ||
      text.includes('invalid-argument');
    return { name, url, status: res.status, reachable, snippet: text.slice(0, 120) };
  } catch (err) {
    return { name, url, status: 0, reachable: false, snippet: String(err.message ?? err) };
  }
}

console.log('Luna Nihongo — Email setup checklist (SendFox + Resend)\n');

console.log('── SendFox (marketing) ──');
console.log('1. Google Admin: alias luna@brignole.ch');
console.log('2. SendFox dashboard: create lists luna-it and luna-en');
console.log('3. Welcome automations (days 0, 5, 12) — From: Luna Nihongo <luna@brignole.ch>');
console.log('4. Firebase secrets:');
console.log('   firebase functions:secrets:set SENDFOX_API_TOKEN');
console.log('   firebase functions:secrets:set SENDFOX_LIST_ID_LUNA_IT');
console.log('   firebase functions:secrets:set SENDFOX_LIST_ID_LUNA_EN');
console.log('');

console.log('── Resend (transactional, free: 100/day, 3000/month) ──');
console.log('1. resend.com → add domain brignole.ch → DNS DKIM/SPF (keep SendFox records)');
console.log('2. Firebase secret:');
console.log('   firebase functions:secrets:set RESEND_API_KEY');
console.log('3. Optional param RESEND_FROM (default Luna Nihongo <luna@brignole.ch>)');
console.log('');

console.log('── Firebase Auth (verify + reset) ──');
console.log('Console → Authentication → Templates → customize IT/EN');
console.log('Action URL: https://lunanihongo.com');
console.log('');

console.log('── Deploy ──');
console.log('   npm run functions:deploy');
console.log('   npm run functions:allow-public:gcloud  (add new callables to allow-public script)');
console.log('');

console.log('Probing callable endpoints…\n');
for (const name of CALLABLES) {
  const r = await probeCallable(name);
  const icon = r.reachable ? '✓' : '✗';
  console.log(`${icon} ${name} → HTTP ${r.status}`);
  if (!r.reachable) console.log(`    ${r.snippet}`);
}
