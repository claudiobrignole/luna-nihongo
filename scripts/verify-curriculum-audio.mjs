#!/usr/bin/env node
/**
 * Verify curriculum audio manifest matches hydrated curriculum and files exist.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AUDIO_DIR,
  MANIFEST_PATH,
  loadCurriculumSpeakables,
  uniqueTextHashes,
} from './curriculum-audio-lib.mjs';
import { TTS_PROMPT_VERSION } from './tts-lib.mjs';

function main() {
  const { entries: expectedMap, errors, curriculum } = loadCurriculumSpeakables();
  if (errors.length) {
    console.error('Curriculum TTS validation errors:');
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }

  if (!existsSync(MANIFEST_PATH)) {
    console.error(`Missing manifest: ${MANIFEST_PATH}`);
    console.error('Run: npm run curriculum:build && npm run audio:sync -- --all');
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const problems = [];

  if (manifest.ttsProfile?.promptVersion !== TTS_PROMPT_VERSION) {
    problems.push(
      `manifest ttsProfile.promptVersion=${manifest.ttsProfile?.promptVersion} != ${TTS_PROMPT_VERSION} (run npm run audio:sync -- --all)`,
    );
  }

  if (manifest.curriculumSchemaVersion !== curriculum.schemaVersion) {
    problems.push(
      `manifest curriculumSchemaVersion=${manifest.curriculumSchemaVersion} != ${curriculum.schemaVersion}`,
    );
  }

  const isComplete = manifest.stats?.complete === true;

  if (!isComplete) {
    const present = manifest.stats?.presentUniqueFiles ?? '?';
    const expected = manifest.stats?.expectedUniqueFiles ?? uniqueTextHashes(expectedMap).size;
    problems.push(
      `incomplete audio bundle (${present}/${expected} unique files). Run npm run audio:batch (or npm run audio:sync for delta).`,
    );
  }

  for (const [id, expected] of expectedMap) {
    const entry = manifest.entries?.[id];
    if (!entry) {
      if (isComplete) problems.push(`missing manifest entry: ${id}`);
      continue;
    }
    if (entry.text !== expected.text) {
      problems.push(`text mismatch for ${id}`);
    }
    if (entry.textHash !== expected.textHash) {
      problems.push(`hash mismatch for ${id}`);
    }
    const filePath = join(AUDIO_DIR, entry.file);
    if (!existsSync(filePath)) {
      problems.push(`missing file: ${entry.file} (${id})`);
    }
  }

  const expectedIds = new Set(expectedMap.keys());
  for (const id of Object.keys(manifest.entries ?? {})) {
    if (!expectedIds.has(id)) {
      problems.push(`stale manifest entry (removed from curriculum): ${id}`);
    }
  }

  if (problems.length) {
    console.error(`Curriculum audio verify failed (${problems.length} issue(s)):`);
    for (const p of problems.slice(0, 30)) console.error(`  - ${p}`);
    if (problems.length > 30) console.error(`  … and ${problems.length - 30} more`);
    console.error('\nFix: npm run audio:sync');
    process.exit(1);
  }

  console.log(
    `✓ Curriculum audio OK (${expectedMap.size} entries, ${Object.keys(manifest.byTextHash ?? {}).length} unique files)`,
  );
}

main();
