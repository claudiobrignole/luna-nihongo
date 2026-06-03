#!/usr/bin/env node
/**
 * Generates public/api/gemini-secret.php from GEMINI_API_KEY at build time.
 * Used on Hostinger: set GEMINI_API_KEY in hPanel Environment Variables
 * (same screen as VITE_FIREBASE_*). Never commit the generated file.
 */
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'public/api/gemini-secret.php');
const apiKey = process.env.GEMINI_API_KEY?.trim();

if (!apiKey) {
  if (existsSync(outPath)) {
    unlinkSync(outPath);
  }
  console.warn(
    '⚠️  GEMINI_API_KEY non impostata — gemini-secret.php non generato.\n' +
    '   Su Hostinger: aggiungi GEMINI_API_KEY nelle Environment Variables del deploy.\n' +
    '   In locale: export GEMINI_API_KEY=... oppure usa public/api/bootstrap.local.php'
  );
  process.exit(0);
}

const php = `<?php
// Auto-generated at build — do not edit or commit
define('LUNA_GEMINI_API_KEY', ${JSON.stringify(apiKey)});
`;

writeFileSync(outPath, php, 'utf8');
console.log('✅ public/api/gemini-secret.php generato per il deploy');
