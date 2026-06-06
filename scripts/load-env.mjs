import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** @returns {Record<string, string>} */
export function parseEnvFile(text) {
  const env = {};
  const normalized = text.replace(/^\uFEFF/, '');
  for (const line of normalized.split('\n')) {
    let trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('export ')) trimmed = trimmed.slice(7).trim();
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

/** Load project .env into process.env (does not overwrite existing env vars). */
export function loadDotEnv() {
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) return parseEnvFile('');
  const parsed = parseEnvFile(readFileSync(envPath, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (!(key in process.env)) process.env[key] = value;
  }
  return parsed;
}

const GEMINI_ALIASES = ['GEMINI_API_KEY', 'VITE_GEMINI_API_KEY', 'GOOGLE_API_KEY'];

export function getGeminiApiKeyFromEnv() {
  loadDotEnv();
  for (const key of GEMINI_ALIASES) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return '';
}

export function geminiKeyDiagnostics() {
  const parsed = loadDotEnv();
  const present = GEMINI_ALIASES.filter((key) => Boolean(parsed[key]?.trim()));
  const keysInFile = Object.keys(parsed);
  return { present, keysInFile, hasKey: getGeminiApiKeyFromEnv() !== '' };
}
