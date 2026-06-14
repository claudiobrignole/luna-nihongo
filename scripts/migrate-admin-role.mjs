#!/usr/bin/env node
/**
 * Migrate legacy role `admin` → `teacher`.
 * Usage: node scripts/migrate-admin-role.mjs [--dry-run]
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'fs';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, '..', 'functions', 'package.json'));
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const dryRun = process.argv.includes('--dry-run');

const PROJECT_ID = 'luna-nihongo';

function initAdmin() {
  if (getApps().length) return;
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath) {
    initializeApp({
      credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))),
      projectId: PROJECT_ID,
    });
  } else {
    initializeApp({ projectId: PROJECT_ID });
  }
}

async function main() {
  initAdmin();
  const db = getFirestore();
  const snap = await db.collection('users').where('role', '==', 'admin').get();
  console.log(`Found ${snap.size} user(s) with role admin`);
  for (const doc of snap.docs) {
    console.log(`  ${doc.id} ${doc.data().email ?? ''}`);
    if (!dryRun) {
      await doc.ref.update({ role: 'teacher', updatedAt: new Date().toISOString() });
    }
  }
  if (dryRun) console.log('Dry run — no writes.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
