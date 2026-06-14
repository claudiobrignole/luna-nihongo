/**
 * Extract speakable curriculum entries and normalize/hash text for audio manifest.
 * Shared by sync-curriculum-audio.mjs and verify-curriculum-audio.mjs.
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const CURRICULUM_JSON = join(ROOT, 'content/curriculum/build/curriculum.json');
export const AUDIO_DIR = join(ROOT, 'public/audio/curriculum');
export const AUDIO_FILES_DIR = join(AUDIO_DIR, 'files');
export const MANIFEST_PATH = join(AUDIO_DIR, 'manifest.json');

export const MAX_TTS_CHARS = 120;

export function normalizeJapaneseText(text) {
  return String(text ?? '').normalize('NFC').trim();
}

export function hashJapaneseText(text) {
  const normalized = normalizeJapaneseText(text);
  return createHash('sha256').update(normalized, 'utf8').digest('hex').slice(0, 16);
}

export function grammarExampleId(grammarId, index) {
  return `${grammarId}:ex${index}`;
}

export function dialogueLineId(dialogueId, lineIndex) {
  return `${dialogueId}-L${lineIndex}`;
}

function isKanaItem(item) {
  return typeof item === 'object' && item !== null && 'script' in item;
}

function isKanjiItem(item) {
  return typeof item === 'object' && item !== null && 'strokeCount' in item;
}

function isVocabItem(item) {
  return typeof item === 'object' && item !== null && 'tags' in item;
}

function isGrammarPoint(item) {
  return typeof item === 'object' && item !== null && 'explanation' in item && 'title' in item;
}

function pushEntry(map, id, text, errors) {
  const normalized = normalizeJapaneseText(text);
  if (!normalized) return;
  if (normalized.length > MAX_TTS_CHARS) {
    errors.push(`[${id}] text exceeds ${MAX_TTS_CHARS} chars (${normalized.length})`);
    return;
  }
  if (map.has(id)) {
    const prev = map.get(id);
    if (prev.text !== normalized) {
      errors.push(`[${id}] duplicate id with different text`);
    }
    return;
  }
  map.set(id, { id, text: normalized, textHash: hashJapaneseText(normalized) });
}

function collectFromUnit(unit, map, errors) {
  for (const k of unit.kana ?? []) pushEntry(map, k.id, k.japanese, errors);
  for (const k of unit.kanji ?? []) pushEntry(map, k.id, k.japanese, errors);
  for (const v of unit.vocab ?? []) pushEntry(map, v.id, v.japanese, errors);

  for (const g of unit.grammar ?? []) {
    g.examples?.forEach((ex, index) => {
      pushEntry(map, grammarExampleId(g.id, index), ex.japanese, errors);
    });
    const first = g.examples?.[0];
    if (first) pushEntry(map, g.id, first.japanese, errors);
  }

  for (const item of unit.reviewPool ?? []) {
    if (isKanaItem(item)) pushEntry(map, item.id, item.japanese, errors);
    else if (isKanjiItem(item)) pushEntry(map, item.id, item.japanese, errors);
    else if (isVocabItem(item)) pushEntry(map, item.id, item.japanese, errors);
    else if (isGrammarPoint(item)) {
      item.examples?.forEach((ex, index) => {
        pushEntry(map, grammarExampleId(item.id, index), ex.japanese, errors);
      });
      const first = item.examples?.[0];
      if (first) pushEntry(map, item.id, first.japanese, errors);
    }
  }

  for (const scene of unit.dialogues ?? []) {
    scene.lines.forEach((line, lineIndex) => {
      pushEntry(map, dialogueLineId(scene.id, lineIndex), line.japanese, errors);
    });
  }
}

/** @returns {{ entries: Map<string, { id: string, text: string, textHash: string }>, errors: string[], curriculum: object }} */
export function loadCurriculumSpeakables(curriculumPath = CURRICULUM_JSON) {
  if (!existsSync(curriculumPath)) {
    throw new Error(`Curriculum not found: ${curriculumPath}. Run npm run curriculum:build first.`);
  }
  const curriculum = JSON.parse(readFileSync(curriculumPath, 'utf8'));
  const map = new Map();
  const errors = [];

  for (const unit of curriculum.units ?? []) {
    collectFromUnit(unit, map, errors);
  }

  return { entries: map, errors, curriculum };
}

/** Unique texts across all entry ids (for file dedup). */
export function uniqueTextHashes(entriesMap) {
  const byHash = new Map();
  for (const entry of entriesMap.values()) {
    if (!byHash.has(entry.textHash)) {
      byHash.set(entry.textHash, entry.text);
    }
  }
  return byHash;
}

export function buildManifestEntries(entriesMap, fileByHash) {
  /** @type {Record<string, { text: string, textHash: string, file: string, durationMs?: number }>} */
  const entries = {};
  for (const [id, entry] of entriesMap) {
    const file = fileByHash.get(entry.textHash);
    if (!file) continue;
    entries[id] = {
      text: entry.text,
      textHash: entry.textHash,
      file,
    };
  }
  return entries;
}

export function buildByTextHash(entriesMap, fileByHash) {
  /** @type {Record<string, string>} */
  const byTextHash = {};
  for (const entry of entriesMap.values()) {
    const file = fileByHash.get(entry.textHash);
    if (file) byTextHash[entry.textHash] = file;
  }
  return byTextHash;
}
