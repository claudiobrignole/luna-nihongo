/**
 * Shared Gemini TTS helpers (dev-api + curriculum audio sync).
 * Keep voice/prompt/models in sync with public/api/bootstrap.php.
 */

export const TTS_MODELS = [
  'gemini-2.5-flash-preview-tts',
  'gemini-3.1-flash-tts-preview',
];

export const TTS_VOICE = 'Kore';

/** Bump when prompt/voice/models change to trigger full regen via audio:sync --all */
export const TTS_PROMPT_VERSION = 1;

export function geminiErrorMessage(data, fallback = 'Gemini API call failed.') {
  if (data?.error?.message) return String(data.error.message);
  if (typeof data?.error === 'string') return data.error;
  if (data?.promptFeedback?.blockReason) {
    return `Request blocked: ${data.promptFeedback.blockReason}`;
  }
  return fallback;
}

export function parsePcmSampleRate(mimeType) {
  const match = mimeType?.match(/rate=(\d+)/i);
  return match ? Number(match[1]) : 24000;
}

export function pcmToWav(pcm, sampleRate = 24000) {
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

export function wavDurationMs(wavBuffer) {
  if (wavBuffer.length < 44) return 0;
  const sampleRate = wavBuffer.readUInt32LE(24);
  const dataSize = wavBuffer.readUInt32LE(40);
  if (!sampleRate) return 0;
  return Math.round((dataSize / (sampleRate * 2)) * 1000);
}

export function buildTtsPrompt(text) {
  return `Read the following Japanese text aloud naturally, clearly, and at a moderate pace for a language learner:\n\n${text}`;
}

export async function geminiFetch(url, apiKey, payload, timeoutMs = 30000) {
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

/**
 * @param {string} text - normalized Japanese (max 120 chars)
 * @param {string} apiKey
 * @returns {Promise<{ wav: Buffer, model: string, sampleRate: number, durationMs: number }>}
 */
export async function synthesizeJapaneseWav(text, apiKey) {
  const trimmed = text.trim();
  if (!trimmed) {
    throw Object.assign(new Error('Missing text field.'), { status: 400 });
  }
  if (trimmed.length > 120) {
    throw Object.assign(new Error('Text too long for TTS (max 120 characters).'), { status: 400 });
  }

  const payload = {
    contents: [{ parts: [{ text: buildTtsPrompt(trimmed) }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: TTS_VOICE },
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
      wav,
      model,
      sampleRate,
      durationMs: wavDurationMs(wav),
    };
  }

  throw Object.assign(new Error(lastError.error), {
    status: lastError.status >= 400 && lastError.status < 600 ? lastError.status : 502,
    model: lastError.model,
  });
}

/** Dev API handler shape (returns base64 JSON payload). */
export async function synthesizeTts(body, getApiKey) {
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  const apiKey = getApiKey();
  const { wav, model, sampleRate } = await synthesizeJapaneseWav(text, apiKey);
  return {
    audioBase64: wav.toString('base64'),
    mimeType: 'audio/wav',
    source: 'gemini',
    model,
    sampleRate,
  };
}
