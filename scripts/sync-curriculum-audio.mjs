#!/usr/bin/env node
/**
 * Sync pre-generated curriculum audio (Gemini TTS → static WAV files).
 *
 * Usage:
 *   node scripts/sync-curriculum-audio.mjs              # delta only
 *   node scripts/sync-curriculum-audio.mjs --all          # regenerate all
 *   node scripts/sync-curriculum-audio.mjs --id hira-a,dlg-self-intro-L0
 *   node scripts/sync-curriculum-audio.mjs --force       # with --id, overwrite same hash
 *   node scripts/sync-curriculum-audio.mjs --batch          # Batch API (missing files)
 *   node scripts/sync-curriculum-audio.mjs --batch-resume   # Poll + download pending batch job
 *   node scripts/sync-curriculum-audio.mjs --batch-no-wait  # Submit batch, exit (resume later)
 */
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  unlinkSync,
  renameSync,
} from 'node:fs';
import { join } from 'node:path';
import { loadDotEnv, getGeminiApiKeyFromEnv } from './load-env.mjs';
import {
  TTS_MODELS,
  TTS_VOICE,
  TTS_PROMPT_VERSION,
  synthesizeJapaneseWav,
} from './tts-lib.mjs';
import {
  TTS_BATCH_MODEL,
  submitTtsBatch,
  waitForBatchJob,
  applyBatchResults,
  getBatchJob,
  saveBatchJobMeta,
  loadBatchJobMeta,
  clearBatchJobMeta,
  isBatchSuccess,
  isTerminalBatchState,
} from './tts-batch-lib.mjs';
import {
  AUDIO_DIR,
  AUDIO_FILES_DIR,
  MANIFEST_PATH,
  loadCurriculumSpeakables,
  uniqueTextHashes,
  buildManifestEntries,
  buildByTextHash,
} from './curriculum-audio-lib.mjs';

loadDotEnv();

const args = process.argv.slice(2);
const REGEN_ALL = args.includes('--all');
const MANIFEST_ONLY = args.includes('--manifest-only');
const FORCE = args.includes('--force');
const GC = args.includes('--gc');
const USE_BATCH = args.includes('--batch') || args.includes('--batch-resume');
const BATCH_RESUME = args.includes('--batch-resume');
const BATCH_NO_WAIT = args.includes('--batch-no-wait');
const FORCE_SYNC = args.includes('--sync');
const BATCH_AUTO_THRESHOLD = Number(process.env.AUDIO_BATCH_THRESHOLD || 10);
const idArg = args.find((a) => a.startsWith('--id='))?.slice(5)
  ?? (args.includes('--id') ? args[args.indexOf('--id') + 1] : null);
const TARGET_IDS = idArg ? new Set(idArg.split(',').map((s) => s.trim()).filter(Boolean)) : null;

const CONCURRENCY = Number(process.env.AUDIO_SYNC_CONCURRENCY || 1);
const REQUEST_DELAY_MS = Number(process.env.AUDIO_SYNC_DELAY_MS || 400);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function readManifest() {
  if (!existsSync(MANIFEST_PATH)) return null;
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
}

function wavPathForHash(textHash) {
  return join(AUDIO_FILES_DIR, `${textHash}.wav`);
}

function relativeFilePath(textHash) {
  return `files/${textHash}.wav`;
}

async function generateWithRetry(text, apiKey, attempt = 1) {
  try {
    if (REQUEST_DELAY_MS > 0) await sleep(REQUEST_DELAY_MS);
    return await synthesizeJapaneseWav(text, apiKey);
  } catch (err) {
    const status = err.status ?? 0;
    const message = err instanceof Error ? err.message : String(err);
    const quotaExceeded = message.includes('Quota exceeded') || message.includes('RESOURCE_EXHAUSTED');
    if (quotaExceeded) throw err;
    const retriable = status === 429 || status === 503 || status === 0 || status === 502;
    if (attempt < 5 && retriable) {
      const delay = 1000 * 2 ** attempt;
      console.warn(`  retry ${attempt}/4 in ${delay}ms (${message})`);
      await sleep(delay);
      return generateWithRetry(text, apiKey, attempt + 1);
    }
    throw err;
  }
}

async function runPool(tasks, concurrency) {
  let index = 0;
  const results = [];

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()));
  return results;
}

function collectDurationByHash(manifest, entriesMap) {
  const durations = new Map();
  if (manifest?.entries) {
    for (const entry of Object.values(manifest.entries)) {
      if (entry.textHash && entry.durationMs) {
        durations.set(entry.textHash, entry.durationMs);
      }
    }
  }
  for (const entry of entriesMap.values()) {
    const wavPath = wavPathForHash(entry.textHash);
    if (existsSync(wavPath) && !durations.has(entry.textHash)) {
      const buf = readFileSync(wavPath);
      const sampleRate = buf.readUInt32LE(24);
      const dataSize = buf.readUInt32LE(40);
      if (sampleRate) {
        durations.set(entry.textHash, Math.round((dataSize / (sampleRate * 2)) * 1000));
      }
    }
  }
  return durations;
}

async function runBatchGeneration(apiKey, hashToText, { wait = true } = {}) {
  const pending = loadBatchJobMeta();
  if (BATCH_RESUME && pending?.batchName) {
    console.log(`Resuming batch job: ${pending.batchName}`);
    const job = wait
      ? await waitForBatchJob(apiKey, pending.batchName, {
          pollMs: 15000,
          onStatus: (state) => console.log(`  batch state: ${state}`),
        })
      : await getBatchJob(apiKey, pending.batchName);
    if (!isBatchSuccess(job.state)) {
      if (!wait && !isTerminalBatchState(job.state)) {
        console.log(`Batch still ${job.state}. Re-run: npm run audio:sync -- --batch-resume`);
        return { submitted: false, pending: true };
      }
      throw new Error(`Batch job ended with state ${job.state}${job.error ? `: ${job.error}` : ''}`);
    }
    const { written, failed } = await applyBatchResults(apiKey, pending.batchName, wavPathForHash);
    clearBatchJobMeta();
    console.log(`Batch complete: ${written} WAV written, ${failed.length} failed`);
    for (const f of failed.slice(0, 10)) console.error(`  FAIL ${f.hash}: ${f.error}`);
    if (failed.length) process.exitCode = 1;
    return { submitted: true, written, failed };
  }

  if (hashToText.size === 0) return { submitted: false, written: 0, failed: [] };

  console.log(`Submitting Batch API job (${hashToText.size} items, model ${TTS_BATCH_MODEL})…`);
  const job = await submitTtsBatch(apiKey, hashToText, {
    displayName: `luna-curriculum-audio-${new Date().toISOString().slice(0, 10)}`,
  });
  saveBatchJobMeta({
    batchName: job.name,
    model: TTS_BATCH_MODEL,
    itemCount: job.itemCount,
    hashes: [...hashToText.keys()],
    createdAt: new Date().toISOString(),
  });
  console.log(`Batch job created: ${job.name} (${job.itemCount} requests)`);

  if (!wait) {
    console.log('Job submitted. Poll with: npm run audio:sync -- --batch-resume');
    return { submitted: true, pending: true };
  }

  console.log('Waiting for batch completion (typically minutes, up to 24h)…');
  await waitForBatchJob(apiKey, job.name, {
    pollMs: 15000,
    onStatus: (state) => console.log(`  batch state: ${state}`),
  });
  const { written, failed } = await applyBatchResults(apiKey, job.name, wavPathForHash);
  clearBatchJobMeta();
  console.log(`Batch complete: ${written} WAV written, ${failed.length} failed`);
  for (const f of failed.slice(0, 10)) console.error(`  FAIL ${f.hash}: ${f.error}`);
  if (failed.length) process.exitCode = 1;
  return { submitted: true, written, failed };
}

async function main() {
  const { entries: entriesMap, errors, curriculum } = loadCurriculumSpeakables();
  if (errors.length) {
    console.error('Curriculum TTS validation errors:');
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }

  const prevManifest = readManifest();
  const uniqueHashes = uniqueTextHashes(entriesMap);
  const apiKey = getGeminiApiKeyFromEnv();

  mkdirSync(AUDIO_FILES_DIR, { recursive: true });

  const hashesToGenerate = new Set();

  if (REGEN_ALL) {
    for (const hash of uniqueHashes.keys()) hashesToGenerate.add(hash);
  } else if (TARGET_IDS) {
    for (const id of TARGET_IDS) {
      const entry = entriesMap.get(id);
      if (!entry) {
        console.error(`Unknown audio id: ${id}`);
        process.exit(1);
      }
      hashesToGenerate.add(entry.textHash);
    }
    if (FORCE) {
      // force regen even if file exists
    } else {
      for (const hash of [...hashesToGenerate]) {
        if (existsSync(wavPathForHash(hash))) hashesToGenerate.delete(hash);
      }
    }
  } else {
    for (const [hash, text] of uniqueHashes) {
      const wavPath = wavPathForHash(hash);
      if (existsSync(wavPath)) {
        const prevEntry = prevManifest?.entries
          ? Object.values(prevManifest.entries).find((e) => e.textHash === hash)
          : null;
        const profileOk = prevManifest?.ttsProfile?.promptVersion === TTS_PROMPT_VERSION;
        if (!prevManifest || (prevEntry?.text === text && profileOk)) {
          continue;
        }
      }
      hashesToGenerate.add(hash);
    }
  }

  if (TARGET_IDS && FORCE) {
    for (const id of TARGET_IDS) {
      const entry = entriesMap.get(id);
      if (entry) hashesToGenerate.add(entry.textHash);
    }
  }

  const total = hashesToGenerate.size;
  const useBatch =
    !MANIFEST_ONLY
    && !BATCH_RESUME
    && !FORCE_SYNC
    && (USE_BATCH || (total >= BATCH_AUTO_THRESHOLD && !TARGET_IDS));
  const hashToText = new Map(
    [...hashesToGenerate].map((hash) => [hash, uniqueHashes.get(hash)]),
  );

  if (MANIFEST_ONLY) {
    console.log('Manifest-only mode — skipping Gemini TTS generation.');
  } else if (BATCH_RESUME) {
    if (!apiKey) {
      console.error('GEMINI_API_KEY required. Add to .env and retry.');
      process.exit(1);
    }
    await runBatchGeneration(apiKey, hashToText, { wait: !BATCH_NO_WAIT });
  } else if (total === 0) {
    console.log('No audio files to generate (manifest up to date).');
  } else if (!apiKey) {
    console.error('GEMINI_API_KEY required to generate audio. Add to .env and retry.');
    process.exit(1);
  } else if (useBatch) {
    await runBatchGeneration(apiKey, hashToText, { wait: !BATCH_NO_WAIT });
  } else {
    console.log(`Generating ${total} audio file(s)…`);
    let done = 0;
    const hashList = [...hashesToGenerate];

    const tasks = hashList.map((hash) => async () => {
      const text = uniqueHashes.get(hash);
      const wavPath = wavPathForHash(hash);
      try {
        const { wav, durationMs } = await generateWithRetry(text, apiKey);
        writeFileSync(wavPath, wav);
        done += 1;
        console.log(`  [${done}/${total}] ${hash} (${text.slice(0, 24)}${text.length > 24 ? '…' : ''}) ${durationMs}ms`);
        return { hash, durationMs, ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  FAIL ${hash} (${text.slice(0, 24)}): ${message}`);
        return { hash, ok: false, error: message };
      }
    });

    const results = await runPool(tasks, CONCURRENCY);
    const failed = results.filter((r) => r && !r.ok);
    if (failed.length) {
      console.error(`\n${failed.length} audio file(s) failed. Re-run: npm run audio:sync`);
      process.exitCode = 1;
    }
  }

  const durationByHash = collectDurationByHash(prevManifest, entriesMap);
  const fileByHash = new Map();
  for (const hash of uniqueHashes.keys()) {
    const rel = relativeFilePath(hash);
    if (existsSync(wavPathForHash(hash))) {
      fileByHash.set(hash, rel);
    }
  }

  const missingFiles = [...uniqueHashes.keys()].filter((h) => !fileByHash.has(h));
  if (missingFiles.length && !REGEN_ALL && !TARGET_IDS) {
    console.warn(`Warning: ${missingFiles.length} text hash(es) missing WAV (run with --all or ensure GEMINI_API_KEY).`);
  }

  const manifestEntries = buildManifestEntries(entriesMap, fileByHash);
  for (const [id, meta] of Object.entries(manifestEntries)) {
    const ms = durationByHash.get(meta.textHash);
    if (ms) meta.durationMs = ms;
  }

  const manifest = {
    version: 1,
    ttsProfile: {
      voice: TTS_VOICE,
      models: TTS_MODELS,
      promptVersion: TTS_PROMPT_VERSION,
    },
    curriculumSchemaVersion: curriculum.schemaVersion ?? 'unknown',
    generatedAt: new Date().toISOString(),
    stats: {
      expectedUniqueFiles: uniqueHashes.size,
      presentUniqueFiles: fileByHash.size,
      expectedEntries: entriesMap.size,
      presentEntries: Object.keys(manifestEntries).length,
      complete: fileByHash.size === uniqueHashes.size,
    },
    entries: manifestEntries,
    byTextHash: buildByTextHash(entriesMap, fileByHash),
  };

  const tmpPath = `${MANIFEST_PATH}.tmp`;
  writeFileSync(tmpPath, `${JSON.stringify(manifest, null, 2)}\n`);
  renameSync(tmpPath, MANIFEST_PATH);

  console.log(`Manifest → ${MANIFEST_PATH} (${Object.keys(manifest.entries).length} entries, ${fileByHash.size} unique files)`);

  if (GC) {
    const referenced = new Set([...fileByHash.values()].map((f) => f.replace('files/', '')));
    let removed = 0;
    for (const name of readdirSync(AUDIO_FILES_DIR)) {
      if (!name.endsWith('.wav')) continue;
      if (!referenced.has(name)) {
        unlinkSync(join(AUDIO_FILES_DIR, name));
        removed += 1;
      }
    }
    if (removed) console.log(`Removed ${removed} orphan WAV file(s).`);
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
