#!/usr/bin/env node
/**
 * Local dev API (replaces `php -S` when PHP is not installed).
 * Mirrors public/api/*.php on http://localhost:8080
 */
import { createServer } from 'node:http';
import { loadDotEnv, getGeminiApiKeyFromEnv, geminiKeyDiagnostics } from './load-env.mjs';
import { createLiveSessionToken as createLiveToken } from './gemini-live-token.mjs';
import { gradeWritingSubmission } from './writing-grade-lib.mjs';
import { geminiFetch, geminiErrorMessage, synthesizeTts } from './tts-lib.mjs';

loadDotEnv();

const PORT = Number(process.env.LUNA_DEV_API_PORT || 8080);

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
  '/api/tts.php': (body) => synthesizeTts(body, getGeminiApiKey),
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
