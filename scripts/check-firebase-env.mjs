import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnvFile, getGeminiApiKeyFromEnv } from './load-env.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');

const firebaseRequired = [
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
  process.exit(1);
}

const env = parseEnvFile(readFileSync(envPath, 'utf8'));

const missingFirebase = firebaseRequired.filter((key) => !env[key]);
if (missingFirebase.length) {
  console.error('❌ Variabili Firebase mancanti in .env:');
  missingFirebase.forEach((key) => console.error(`   - ${key}`));
  process.exit(1);
}

console.log('✅ Firebase .env OK');
console.log(`   Project ID: ${env.VITE_FIREBASE_PROJECT_ID}`);

if (!getGeminiApiKeyFromEnv()) {
  console.warn('⚠️  GEMINI_API_KEY mancante — tutor, TTS e Luna Live non funzioneranno in locale.');
  console.warn('   Aggiungi in .env: GEMINI_API_KEY=AIza... (stessa chiave di Hostinger)');
  process.exit(1);
}

console.log('✅ GEMINI_API_KEY presente');
