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
const SERVICES = ['createlivesession', 'endlivesession', 'deletelivesession'];

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
  console.error('\nManual fix (Google Cloud Console):');
  console.error('  Cloud Run → createlivesession → Security → Allow public access');
  console.error('  Cloud Run → endlivesession → Security → Allow public access');
  console.error('  Cloud Run → deletelivesession → Security → Allow public access');
  process.exit(1);
});
