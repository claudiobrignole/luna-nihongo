#!/usr/bin/env node
/**
 * Local dev API (replaces `php -S` when PHP is not installed).
 * Mirrors public/api/*.php on http://localhost:8080
 */
import { createServer } from 'node:http';
import { loadDotEnv, getGeminiApiKeyFromEnv, geminiKeyDiagnostics } from './load-env.mjs';
import { createLiveSessionToken as createLiveToken } from './gemini-live-token.mjs';
import { gradeWritingSubmission } from './writing-grade-lib.mjs';

loadDotEnv();

const PORT = Number(process.env.LUNA_DEV_API_PORT || 8080);

const TTS_MODELS = [
  'gemini-3.1-flash-tts-preview',
  'gemini-2.5-flash-preview-tts',
  'gemini-2.5-pro-preview-tts',
];

const TUTOR_MODEL = 'gemini-2.5-flash';

function getGeminiApiKey() {
  const key = getGeminiApiKeyFromEnv();
  if (!key) {
    throw new Error(
      'GEMINI_API_KEY mancante in .env. Aggiungi una riga: GEMINI_API_KEY=AIza... (senza spazi intorno a =). Salva il file e riavvia dev:all.',
    );
  }
  return key;
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(body));
}

function geminiErrorMessage(data, fallback = 'Gemini API call failed.') {
  if (data?.error?.message) return String(data.error.message);
  if (typeof data?.error === 'string') return data.error;
  if (data?.promptFeedback?.blockReason) {
    return `Request blocked: ${data.promptFeedback.blockReason}`;
  }
  return fallback;
}

function parsePcmSampleRate(mimeType) {
  const match = mimeType?.match(/rate=(\d+)/i);
  return match ? Number(match[1]) : 24000;
}

function pcmToWav(pcm, sampleRate = 24000) {
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function geminiFetch(url, apiKey, payload, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  } finally {
    clearTimeout(timer);
  }
}

async function createLiveSessionToken(systemPrompt) {
  const apiKey = getGeminiApiKey();
  return createLiveToken(apiKey, systemPrompt);
}

async function fetchTutorReply(body) {
  if (!body?.messages?.length) {
    throw Object.assign(new Error('Invalid request body.'), { status: 400 });
  }

  const apiKey = getGeminiApiKey();

  const systemPrompt = body.systemPrompt ?? 'You are Luna-sensei, a Japanese language tutor.';
  const messages = body.messages ?? [];
  const maxOutputTokens = Number.isFinite(body.maxOutputTokens) ? Number(body.maxOutputTokens) : 400;

  const payload = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    })),
    generationConfig: {
      maxOutputTokens,
      temperature: 0.75,
    },
  };

  const { response, data } = await geminiFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${TUTOR_MODEL}:generateContent`,
    apiKey,
    payload,
  );

  if (!response.ok) {
    throw Object.assign(new Error(geminiErrorMessage(data, 'Gemini API call failed.')), {
      status: 502,
      geminiStatus: response.status,
    });
  }

  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response from Gemini.';
  return { reply };
}

async function synthesizeTts(body) {
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text) {
    throw Object.assign(new Error('Missing text field.'), { status: 400 });
  }
  if (text.length > 120) {
    throw Object.assign(new Error('Text too long for TTS (max 120 characters).'), { status: 400 });
  }

  const apiKey = getGeminiApiKey();

  const prompt = `Read the following Japanese text aloud naturally, clearly, and at a moderate pace for a language learner:\n\n${text}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  };

  let lastError = { error: 'Gemini TTS call failed.', status: 502 };

  for (const model of TTS_MODELS) {
    const { response, data } = await geminiFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      apiKey,
      payload,
      45000,
    );

    if (!response.ok) {
      lastError = {
        error: geminiErrorMessage(data, 'Gemini TTS call failed.'),
        status: response.status || 502,
        model,
      };
      continue;
    }

    const candidate = data.candidates?.[0];
    const part = candidate?.content?.parts?.[0];
    const inline = part?.inlineData;

    if (!inline?.data) {
      const finish = candidate?.finishReason ?? 'unknown';
      lastError = {
        error: `No audio returned from Gemini (finish: ${finish}).`,
        status: 502,
        model,
      };
      continue;
    }

    const mimeType = inline.mimeType ?? 'audio/L16;codec=pcm;rate=24000';
    const pcm = Buffer.from(inline.data, 'base64');
    const sampleRate = parsePcmSampleRate(mimeType);
    const wav = pcmToWav(pcm, sampleRate);

    return {
      audioBase64: wav.toString('base64'),
      mimeType: 'audio/wav',
      source: 'gemini',
      model,
      sampleRate,
    };
  }

  throw Object.assign(new Error(lastError.error), {
    status: lastError.status >= 400 && lastError.status < 600 ? lastError.status : 502,
    model: lastError.model,
  });
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function apiKeyErrorStatus(message) {
  return message.includes('GEMINI_API_KEY') ? 500 : 502;
}

const routes = {
  '/api/live-session.php': async (body) => {
    const systemPrompt = body?.systemPrompt;
    if (typeof systemPrompt !== 'string' || !systemPrompt.trim()) {
      throw Object.assign(new Error('Missing systemPrompt.'), { status: 400 });
    }
    return createLiveSessionToken(systemPrompt);
  },
  '/api/tutor.php': (body) => fetchTutorReply(body),
  '/api/writing-grade.php': (body) =>
    gradeWritingSubmission(body, { geminiFetch, getApiKey: getGeminiApiKey }),
  '/api/tts.php': (body) => synthesizeTts(body),
};

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  const url = req.url?.split('?')[0] ?? '';
  const handler = routes[url];

  if (req.method !== 'POST' || !handler) {
    if (req.method !== 'POST' && handler) {
      sendJson(res, 405, { error: 'Method not allowed.' });
      return;
    }
    sendJson(res, 404, {
      error: `Dev API: route not found (${url}). Available: ${Object.keys(routes).join(', ')}`,
    });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const result = await handler(body);
    sendJson(res, 200, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed.';
    const status = err.status ?? apiKeyErrorStatus(message);
    const payload = { error: message };
    if (err.geminiStatus) payload.status = err.geminiStatus;
    if (err.model) payload.model = err.model;
    sendJson(res, status, payload);
  }
});

server.listen(PORT, () => {
  const { hasKey, keysInFile } = geminiKeyDiagnostics();
  console.log(`Luna dev API → http://localhost:${PORT}`);
  if (hasKey) {
    console.log('  ✓ GEMINI_API_KEY loaded');
  } else {
    console.log('  ⚠ GEMINI_API_KEY non trovata in .env');
    console.log(`    Chiavi presenti: ${keysInFile.join(', ') || '(nessuna)'}`);
    console.log('    Aggiungi: GEMINI_API_KEY=AIza...  poi salva e riavvia (Ctrl+C → npm run dev:all)');
  }
  for (const route of Object.keys(routes)) {
    console.log(`  POST ${route}`);
  }
});
