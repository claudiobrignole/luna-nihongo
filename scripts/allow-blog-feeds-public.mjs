#!/usr/bin/env node
/**
 * Make blogRss + blogSitemap publicly reachable without allUsers IAM.
 * Use when Domain Restricted Sharing blocks add-invoker-policy-binding.
 *
 * Usage: npm run allow:blog-feeds
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, '..', 'functions', 'package.json'));
const { GoogleAuth } = require('google-auth-library');

const PROJECT = 'luna-nihongo';
const REGION = 'europe-west1';
const FUNCTIONS = ['blogRss', 'blogSitemap'];

async function getAccessToken() {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) {
    throw new Error('No access token.');
  }
  return token.token;
}

async function getFunction(accessToken, functionName) {
  const url = `https://cloudfunctions.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/functions/${functionName}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getFunction ${functionName} failed (${res.status}): ${text}`);
  }
  return res.json();
}

function cloudRunServiceId(fn) {
  const service = fn?.serviceConfig?.service;
  if (!service || typeof service !== 'string') {
    throw new Error(`No serviceConfig.service on ${fn?.name ?? 'function'}`);
  }
  const id = service.split('/').pop();
  if (!id) throw new Error(`Could not parse Cloud Run service from: ${service}`);
  return id;
}

/** Disable invoker IAM check (works with Domain Restricted Sharing; no allUsers). */
async function disableInvokerIamCheck(accessToken, serviceId) {
  const url = `https://run.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/services/${serviceId}?updateMask=invokerIamDisabled`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ invokerIamDisabled: true }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`disableInvokerIamCheck ${serviceId} failed (${res.status}): ${text}`);
  }
  const body = await res.json();
  console.log(`✓ ${serviceId}: invoker IAM check disabled (public HTTPS)`);
  return body;
}

async function main() {
  const token = await getAccessToken();
  for (const functionName of FUNCTIONS) {
    const fn = await getFunction(token, functionName);
    const serviceId = cloudRunServiceId(fn);
    console.log(`→ ${functionName} → Cloud Run service ${serviceId}`);
    await disableInvokerIamCheck(token, serviceId);
  }
  console.log('Done. Test:');
  console.log(`  curl -sI "https://europe-west1-luna-nihongo.cloudfunctions.net/blogRss?lang=it" | head -1`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  console.error('\nYour org likely blocks allUsers (Domain Restricted Sharing).');
  console.error('Use --no-invoker-iam-check instead of add-invoker-policy-binding:');
  console.error('  npm run allow:blog-feeds');
  console.error('\nOr with gcloud (after discovering service names):');
  console.error('  gcloud run services list --project=luna-nihongo --region=europe-west1 | grep -i blog');
  console.error('  gcloud run services update SERVICE_ID --region=europe-west1 --no-invoker-iam-check --project=luna-nihongo');
  console.error('\nConsole: Cloud Run → service → Security → Allow public access');
  process.exit(1);
});
