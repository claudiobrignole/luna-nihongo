import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MANIFEST_PATH,
  loadCurriculumSpeakables,
  hashJapaneseText,
  normalizeJapaneseText,
} from '../scripts/curriculum-audio-lib.mjs';
import { TTS_PROMPT_VERSION } from '../scripts/tts-lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO_DIR = join(ROOT, 'public/audio/curriculum');

test('normalizeJapaneseText uses NFC trim', () => {
  assert.equal(normalizeJapaneseText('  あ  '), 'あ');
});

test('hashJapaneseText is stable 16-char hex', () => {
  const h = hashJapaneseText('こんにちは');
  assert.match(h, /^[0-9a-f]{16}$/);
  assert.equal(h, hashJapaneseText('こんにちは'));
});

test('curriculum speakables have no validation errors', () => {
  const { entries, errors } = loadCurriculumSpeakables();
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.ok(entries.size > 500, `expected 500+ entries, got ${entries.size}`);
});

test('audio manifest covers all curriculum speakables', { skip: !existsSync(MANIFEST_PATH) ? 'run npm run audio:sync -- --all first' : false }, () => {
  const { entries: expectedMap, curriculum } = loadCurriculumSpeakables();
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const isComplete = manifest.stats?.complete === true;

  assert.equal(manifest.ttsProfile?.promptVersion, TTS_PROMPT_VERSION);
  assert.equal(manifest.curriculumSchemaVersion, curriculum.schemaVersion);

  if (!isComplete) {
    assert.ok(manifest.stats?.presentUniqueFiles > 0, 'partial manifest should list present files');
    return;
  }

  for (const [id, expected] of expectedMap) {
    const entry = manifest.entries[id];
    assert.ok(entry, `missing manifest entry: ${id}`);
    assert.equal(entry.text, expected.text, id);
    assert.equal(entry.textHash, expected.textHash, id);
    assert.ok(existsSync(join(AUDIO_DIR, entry.file)), `missing file for ${id}`);
  }

  assert.equal(
    Object.keys(manifest.entries).length,
    expectedMap.size,
    'manifest should not have stale or missing ids',
  );
});
