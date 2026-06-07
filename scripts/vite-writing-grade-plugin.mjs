/**
 * Dev-only: handle POST /api/writing-grade.php inside Vite so grading works even when
 * an older dev-api process on :8080 has not been restarted yet.
 */
import { loadDotEnv, getGeminiApiKeyFromEnv } from './load-env.mjs';
import { gradeWritingSubmission } from './writing-grade-lib.mjs';

loadDotEnv();

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(null);
      }
    });
    req.on('error', reject);
  });
}

async function geminiFetch(url, apiKey, payload, timeoutMs = 35000) {
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

function getGeminiApiKey() {
  const key = getGeminiApiKeyFromEnv();
  if (!key) {
    throw Object.assign(
      new Error(
        'GEMINI_API_KEY mancante in .env. Aggiungi GEMINI_API_KEY=AIza... e riavvia npm run dev.',
      ),
      { status: 500 },
    );
  }
  return key;
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(body));
}

export default function viteWritingGradePlugin() {
  return {
    name: 'luna-writing-grade-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0] ?? '';
        if (path !== '/api/writing-grade.php') {
          next();
          return;
        }

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed.' });
          return;
        }

        try {
          const body = await readJsonBody(req);
          const result = await gradeWritingSubmission(body, {
            geminiFetch,
            getApiKey: getGeminiApiKey,
          });
          sendJson(res, 200, result);
        } catch (err) {
          const status = err.status ?? 502;
          sendJson(res, status, {
            error: err instanceof Error ? err.message : 'Grading failed.',
          });
        }
      });
    },
  };
}
