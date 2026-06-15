#!/usr/bin/env node
/**
 * Booking + teacher scheduling readiness checklist for Luna Nihongo.
 * Run from repo root: npm run check:booking
 */
import { execSync } from 'node:child_process';

const PROJECT = 'luna-nihongo';
const REGION = 'europe-west1';
const PROJECT_NUMBER = '617461430146';
const COMPUTE_SA = `${PROJECT_NUMBER}-compute@developer.gserviceaccount.com`;

const BOOKING_CALLABLES = [
  'listPublicTeachers',
  'bookAvailabilitySlot',
  'startFreeTrial',
  'listTeacherBookings',
  'cancelBooking',
  'rescheduleBooking',
  'setBookingMeetLink',
];

const CONSOLE_BASE =
  `https://console.cloud.google.com/run?project=${PROJECT}&region=${REGION}`;

async function probeCallable(name, data = {}) {
  const url = `https://${REGION}-${PROJECT}.cloudfunctions.net/${name}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    const text = await res.text();
    const unauthenticated =
      res.status === 401 ||
      res.status === 403 ||
      text.includes('UNAUTHENTICATED') ||
      text.includes('Login required');
    const badRequest =
      res.status === 400 || text.includes('invalid-argument') || text.includes('INVALID_ARGUMENT');
    const ok = unauthenticated || badRequest;
    return { name, url, status: res.status, ok, snippet: text.slice(0, 160) };
  } catch (err) {
    return { name, url, status: 0, ok: false, snippet: String(err.message ?? err) };
  }
}

function hasGcloud() {
  try {
    execSync('gcloud --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function computeSaRoles() {
  if (!hasGcloud()) return null;
  try {
    const out = execSync(
      `gcloud projects get-iam-policy ${PROJECT} --flatten="bindings[].members" `
        + `--filter="bindings.members:serviceAccount:${COMPUTE_SA}" `
        + '--format="value(bindings.role)"',
      { encoding: 'utf8' },
    );
    return out.trim().split('\n').filter(Boolean);
  } catch {
    return null;
  }
}

function recentFirestorePermissionErrors() {
  if (!hasGcloud()) return null;
  try {
    const out = execSync(
      `gcloud logging read 'resource.type="cloud_run_revision" AND severity=ERROR `
        + `AND textPayload:"PERMISSION_DENIED"' --project=${PROJECT} --limit=3 `
        + `--format="value(resource.labels.service_name)"`,
      { encoding: 'utf8', timeout: 30_000 },
    );
    return [...new Set(out.trim().split('\n').filter(Boolean))];
  } catch {
    return null;
  }
}

console.log('Luna Nihongo — Booking setup checklist\n');

console.log('── Data (Firestore) ──');
console.log('1. Teachers need role teacher or super_admin in users/{uid}');
console.log('2. availabilitySlots must be active=true and have teacherId + teacherDisplayName');
console.log('3. Backfill legacy slots (dry-run first):');
console.log('   node scripts/backfill-teacher-slots.mjs --dry-run');
console.log('   node scripts/backfill-teacher-slots.mjs');
console.log('4. Deploy indexes: firebase deploy --only firestore:indexes');
console.log('');

console.log('── Cloud Functions IAM (critical) ──');
console.log(`Default Cloud Run SA: ${COMPUTE_SA}`);
console.log('Required roles on that SA:');
console.log('   roles/datastore.user          (Firestore read/write from callables)');
console.log('   roles/secretmanager.secretAccessor  (Stripe, Resend, SendFox secrets)');
console.log('Fix (once): npm run fix:functions-iam');
console.log('');

console.log('── Public invoker (Cloud Run) ──');
console.log('After deploy: npm run functions:allow-public:gcloud');
console.log(`Console: ${CONSOLE_BASE}`);
console.log('Minimum for booking: bookavailabilityslot, startfreetrial');
console.log('Optional: listpublicteachers (frontend has slot-based fallback)');
console.log('');

console.log('── Deploy ──');
console.log('   npm run functions:deploy');
console.log('   git push   (frontend via Hostinger auto-deploy)');
console.log('');

const roles = computeSaRoles();
if (roles) {
  const hasDatastore = roles.some((r) => r.includes('datastore'));
  const hasSecrets = roles.some((r) => r.includes('secretmanager'));
  console.log('IAM check (gcloud)…\n');
  console.log(`${hasDatastore ? '✓' : '✗'} roles/datastore.user${hasDatastore ? '' : ' — MISSING (callables return 500 on Firestore)'}`);
  console.log(`${hasSecrets ? '✓' : '✗'} roles/secretmanager.secretAccessor${hasSecrets ? '' : ' — may be missing'}`);
  if (!hasDatastore) {
    console.log('   Run: npm run fix:functions-iam');
  }
  console.log('');
} else {
  console.log('IAM check skipped (gcloud not available or not logged in).\n');
}

const permErrors = recentFirestorePermissionErrors();
if (permErrors?.length) {
  console.log('Recent Cloud Run PERMISSION_DENIED (Firestore) on:');
  for (const svc of permErrors) {
    console.log(`   • ${svc}`);
  }
  console.log('   → Fix IAM with: npm run fix:functions-iam\n');
}

console.log('Probing booking callables (no auth — expect 401)…\n');

for (const name of BOOKING_CALLABLES) {
  const r = await probeCallable(name);
  const icon = r.ok ? '✓' : '✗';
  const note = r.status === 401 || r.status === 403 ? ' (reachable)' : r.status === 500 ? ' (500 — often missing datastore.user)' : '';
  console.log(`${icon} ${r.name} → HTTP ${r.status}${note}`);
  if (!r.ok) console.log(`    ${r.snippet}`);
}

const newsletter = await probeCallable('subscribeNewsletter', {
  email: 'probe-check@example.com',
  language: 'it',
});
console.log('');
if (newsletter.status === 200 || newsletter.snippet.includes('"ok":true')) {
  console.log('✓ subscribeNewsletter → OK (newsletter + rate-limit Firestore works)');
} else if (newsletter.status === 500) {
  console.log('✗ subscribeNewsletter → HTTP 500');
  console.log('    Likely Firestore IAM on compute SA (newsletterAttempts read/write).');
  console.log('    Logs: gcloud logging read \'resource.labels.service_name="subscribenewsletter" AND severity=ERROR\' --project=luna-nihongo --limit=3');
  console.log('    Fix: npm run fix:functions-iam');
} else if (newsletter.status === 429 || newsletter.snippet.includes('resource-exhausted')) {
  console.log('✓ subscribeNewsletter → rate-limited (Firestore IAM OK)');
} else {
  console.log(`? subscribeNewsletter → HTTP ${newsletter.status}`);
  console.log(`    ${newsletter.snippet}`);
}

console.log('\nManual E2E: sign in → Prenota → pick teacher → pick slot → confirm intro or Premium lesson.');
