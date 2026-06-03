import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');

const required = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

if (!existsSync(envPath)) {
  console.error('❌ File .env mancante.');
  console.error('   Esegui: cp .env.example .env');
  console.error('   Poi incolla le credenziali da Firebase Console.');
  process.exit(1);
}

const envText = readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line) => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const missing = required.filter((key) => !env[key]);
if (missing.length) {
  console.error('❌ Variabili mancanti in .env:');
  missing.forEach((key) => console.error(`   - ${key}`));
  process.exit(1);
}

console.log('✅ File .env configurato correttamente.');
console.log(`   Project ID: ${env.VITE_FIREBASE_PROJECT_ID}`);
