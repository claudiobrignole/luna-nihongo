#!/usr/bin/env node
/**
 * Grants public Cloud Run Invoker on Luna Live callable services.
 * Run from repo root: npm run allow-public --prefix functions
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const functionsDir = join(here, '..', 'functions');
const require = createRequire(join(functionsDir, 'package.json'));
const { GoogleAuth } = require('google-auth-library');

const PROJECT = 'luna-nihongo';
const REGION = 'europe-west1';
const SERVICES = [
  'createlivesession',
  'endlivesession',
  'deletelivesession',
  'createstripecheckout',
  'createextralessoncheckout',
  'creategiftlessoncheckout',
  'createstripeportal',
  'stripewebhook',
  'startfreetrial',
  'bookavailabilityslot',
  'cancelbooking',
  'reschedulebooking',
  'redeemcoupon',
  'checkgracenoslotscoupon',
  'admincancelbooking',
  'admindeactivateslot',
  'subscribenewsletter',
  'syncmarketingconsent',
  'admindeleteuser',
  'setbookingmeetlink',
  'setteacherpayoutstatus',
];

async function getAccessToken() {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) {
    throw new Error('No access token. Run: gcloud auth application-default login');
  }
  return token.token;
}

async function allowPublicInvoker(accessToken, serviceName) {
  const base = `https://run.googleapis.com/v1/projects/${PROJECT}/locations/${REGION}/services/${serviceName}`;

  const policyRes = await fetch(`${base}:getIamPolicy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!policyRes.ok) {
    const text = await policyRes.text();
    throw new Error(`getIamPolicy ${serviceName} failed (${policyRes.status}): ${text}`);
  }

  const policy = await policyRes.json();
  const bindings = policy.bindings ?? [];
  let invoker = bindings.find((b) => b.role === 'roles/run.invoker');
  if (!invoker) {
    invoker = { role: 'roles/run.invoker', members: [] };
    bindings.push(invoker);
  }
  if (!invoker.members.includes('allUsers')) {
    invoker.members.push('allUsers');
  }

  const setRes = await fetch(`${base}:setIamPolicy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ policy: { ...policy, bindings } }),
  });

  if (!setRes.ok) {
    const text = await setRes.text();
    throw new Error(`setIamPolicy ${serviceName} failed (${setRes.status}): ${text}`);
  }

  console.log(`✓ ${serviceName}: allUsers granted roles/run.invoker`);
}

async function main() {
  const token = await getAccessToken();
  for (const service of SERVICES) {
    await allowPublicInvoker(token, service);
  }
  console.log('Done. Retry Luna Live in the app.');
}

main().catch((err) => {
  console.error(err.message ?? err);
  console.error('\nOption A — gcloud (recommended if you use Firebase CLI):');
  console.error('  gcloud auth application-default login');
  console.error('  bash scripts/allow-public-gcloud.sh');
  console.error('\nOption B — Google Cloud Console → Cloud Run → each service → Security → Allow public access:');
  for (const service of SERVICES) {
    console.error(`  https://console.cloud.google.com/run/detail/${REGION}/${service}/security?project=${PROJECT}`);
  }
  console.error('\nIf IAM still fails, your account may need roles/run.admin or roles/owner on the project.');
  process.exit(1);
});
