#!/usr/bin/env node
/**
 * Backfill teacherId on availabilitySlots missing it (assigns primary super admin).
 * Usage: node scripts/backfill-teacher-slots.mjs [--dry-run]
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
const SUPER_ADMIN_EMAIL = 'claudio@brignole.ch';

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
  const usersSnap = await db.collection('users').where('email', '==', SUPER_ADMIN_EMAIL).limit(1).get();
  if (usersSnap.empty) {
    throw new Error(`Super admin ${SUPER_ADMIN_EMAIL} not found`);
  }
  const luna = usersSnap.docs[0];
  const teacherId = luna.id;
  const teacherDisplayName = String(luna.data().teacherDisplayName ?? luna.data().username ?? 'Luna');

  const slotsSnap = await db.collection('availabilitySlots').get();
  let updated = 0;
  for (const doc of slotsSnap.docs) {
    const data = doc.data();
    if (data.teacherId) continue;
    console.log(`Slot ${doc.id} → teacherId ${teacherId}`);
    if (!dryRun) {
      await doc.ref.set(
        { teacherId, teacherDisplayName, updatedAt: new Date().toISOString() },
        { merge: true },
      );
    }
    updated += 1;
  }
  console.log(`${dryRun ? 'Would update' : 'Updated'} ${updated} slot(s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
