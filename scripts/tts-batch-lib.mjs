/**
 * Gemini Batch API helpers for curriculum TTS generation.
 * @see https://ai.google.dev/gemini-api/docs/batch-api
 */
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TTS_VOICE,
  buildTtsPrompt,
  geminiErrorMessage,
  parsePcmSampleRate,
  pcmToWav,
  wavDurationMs,
} from './tts-lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const BATCH_JOB_PATH = join(ROOT, 'public/audio/curriculum/.batch-job.json');

export const TTS_BATCH_MODEL = 'gemini-3.1-flash-tts-preview';

/** @param {string} textHash */
export function buildBatchTtsLine(textHash, text) {
  return {
    key: textHash,
    request: {
      contents: [{ parts: [{ text: buildTtsPrompt(text) }] }],
      generation_config: {
        response_modalities: ['AUDIO'],
        speech_config: {
          voice_config: {
            prebuilt_voice_config: { voice_name: TTS_VOICE },
          },
        },
      },
    },
  };
}

/**
 * @param {string} apiKey
 * @param {Buffer} body
 * @param {string} displayName
 */
export async function uploadJsonlFile(apiKey, body, displayName) {
  const numBytes = body.length;
  const startRes = await fetch('https://generativelanguage.googleapis.com/upload/v1beta/files', {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(numBytes),
      'X-Goog-Upload-Header-Content-Type': 'application/jsonl',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: displayName } }),
  });

  if (!startRes.ok) {
    const err = await startRes.json().catch(() => ({}));
    throw new Error(geminiErrorMessage(err, `File upload start failed (${startRes.status}).`));
  }

  const uploadUrl = startRes.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error('Missing x-goog-upload-url header from File API.');

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': String(numBytes),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
      'Content-Type': 'application/jsonl',
    },
    body,
  });

  const uploadData = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok) {
    throw new Error(geminiErrorMessage(uploadData, `File upload failed (${uploadRes.status}).`));
  }

  const fileName = uploadData.file?.name;
  if (!fileName) throw new Error('File upload succeeded but file.name missing.');
  return fileName;
}

/** @returns {Promise<{ name: string, state: string, raw: object }>} */
export async function createTtsBatchJob(apiKey, inputFileName, displayName = 'luna-curriculum-audio') {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_BATCH_MODEL}:batchGenerateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      batch: {
        display_name: displayName,
        input_config: { file_name: inputFileName },
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(geminiErrorMessage(data, `batchGenerateContent failed (${res.status}).`));
  }

  const name = data.name;
  if (!name) throw new Error('Batch job created but name missing in response.');
  const state = data.metadata?.state ?? data.state ?? 'JOB_STATE_PENDING';
  return { name, state, raw: data };
}

/** @returns {Promise<{ name: string, state: string, responsesFile: string | null, error: string | null, raw: object }>} */
export async function getBatchJob(apiKey, batchName) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${batchName}`, {
    headers: { 'x-goog-api-key': apiKey },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(geminiErrorMessage(data, `getBatchJob failed (${res.status}).`));
  }

  const state = data.metadata?.state ?? data.state ?? 'UNKNOWN';
  const responsesFile =
    data.response?.responsesFile
    ?? data.metadata?.output?.responsesFile
    ?? data.dest?.fileName
    ?? null;
  const error = data.error?.message ?? null;
  return { name: data.name ?? batchName, state, responsesFile, error, raw: data };
}

export async function downloadBatchResults(apiKey, responsesFile) {
  const path = responsesFile.startsWith('files/') ? responsesFile : `files/${responsesFile}`;
  const url = `https://generativelanguage.googleapis.com/download/v1beta/${path}:download?alt=media`;
  const res = await fetch(url, { headers: { 'x-goog-api-key': apiKey } });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Download batch results failed (${res.status}): ${err.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

const TERMINAL_BATCH_STATES = new Set([
  'JOB_STATE_SUCCEEDED',
  'JOB_STATE_FAILED',
  'JOB_STATE_CANCELLED',
  'JOB_STATE_EXPIRED',
  'BATCH_STATE_SUCCEEDED',
  'BATCH_STATE_FAILED',
  'BATCH_STATE_CANCELLED',
  'BATCH_STATE_EXPIRED',
]);

export function isTerminalBatchState(state) {
  return TERMINAL_BATCH_STATES.has(state);
}

export function isBatchSuccess(state) {
  return state === 'JOB_STATE_SUCCEEDED' || state === 'BATCH_STATE_SUCCEEDED';
}

export async function waitForBatchJob(apiKey, batchName, { pollMs = 15000, onStatus } = {}) {
  while (true) {
    const job = await getBatchJob(apiKey, batchName);
    onStatus?.(job.state);
    if (isTerminalBatchState(job.state)) return job;
    await sleep(pollMs);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** @returns {{ hash: string, wav?: Buffer, durationMs?: number, error?: string }} */
export function parseBatchResultLine(line) {
  const row = JSON.parse(line);
  const hash = row.key ?? row.metadata?.key;
  if (!hash) return { hash: 'unknown', error: 'Missing key in batch result line' };

  if (row.error) {
    const message = row.error.message ?? JSON.stringify(row.error);
    return { hash, error: message };
  }

  const response = row.response ?? row;
  const candidate = response.candidates?.[0];
  const inline = candidate?.content?.parts?.[0]?.inlineData ?? candidate?.content?.parts?.[0]?.inline_data;

  if (!inline?.data) {
    const finish = candidate?.finishReason ?? candidate?.finish_reason ?? 'unknown';
    return { hash, error: `No audio in batch response (finish: ${finish})` };
  }

  const mimeType = inline.mimeType ?? inline.mime_type ?? 'audio/L16;codec=pcm;rate=24000';
  const pcm = Buffer.from(inline.data, 'base64');
  const sampleRate = parsePcmSampleRate(mimeType);
  const wav = pcmToWav(pcm, sampleRate);
  return { hash, wav, durationMs: wavDurationMs(wav) };
}

/** @param {Buffer} jsonlBuffer */
export function parseBatchResultsJsonl(jsonlBuffer) {
  const text = jsonlBuffer.toString('utf8').trim();
  if (!text) return [];
  return text.split('\n').filter(Boolean).map((line) => {
    try {
      return parseBatchResultLine(line);
    } catch (err) {
      return { hash: 'unknown', error: err instanceof Error ? err.message : String(err) };
    }
  });
}

export function saveBatchJobMeta(meta) {
  writeFileSync(BATCH_JOB_PATH, `${JSON.stringify(meta, null, 2)}\n`);
}

export function loadBatchJobMeta() {
  if (!existsSync(BATCH_JOB_PATH)) return null;
  return JSON.parse(readFileSync(BATCH_JOB_PATH, 'utf8'));
}

export function clearBatchJobMeta() {
  if (existsSync(BATCH_JOB_PATH)) unlinkSync(BATCH_JOB_PATH);
}

/**
 * Submit missing TTS items as a batch job.
 * @param {string} apiKey
 * @param {Map<string, string>} hashToText - textHash → japanese text
 */
export async function submitTtsBatch(apiKey, hashToText, { displayName } = {}) {
  const lines = [...hashToText.entries()].map(([hash, text]) =>
    JSON.stringify(buildBatchTtsLine(hash, text)),
  );
  const body = Buffer.from(`${lines.join('\n')}\n`, 'utf8');
  const inputFile = await uploadJsonlFile(apiKey, body, displayName ?? 'luna-curriculum-audio-input');
  const job = await createTtsBatchJob(apiKey, inputFile, displayName ?? 'luna-curriculum-audio');
  return { ...job, inputFile, itemCount: hashToText.size };
}

/**
 * Download batch output and write WAV files.
 * @returns {{ written: number, failed: Array<{ hash: string, error: string }> }}
 */
export async function applyBatchResults(apiKey, batchName, wavPathForHash) {
  const job = await getBatchJob(apiKey, batchName);
  if (!isBatchSuccess(job.state)) {
    throw new Error(`Batch job not succeeded (state: ${job.state})${job.error ? `: ${job.error}` : ''}`);
  }
  if (!job.responsesFile) throw new Error('Batch succeeded but responsesFile missing.');

  const jsonl = await downloadBatchResults(apiKey, job.responsesFile);
  const results = parseBatchResultsJsonl(jsonl);

  let written = 0;
  const failed = [];
  for (const result of results) {
    if (result.wav) {
      writeFileSync(wavPathForHash(result.hash), result.wav);
      written += 1;
    } else {
      failed.push({ hash: result.hash, error: result.error ?? 'Unknown error' });
    }
  }
  return { written, failed, job };
}
