const LIVE_MODELS = [
  'gemini-2.5-flash-native-audio-preview-12-2025',
  'gemini-2.0-flash-live-001',
];

/** Same voice as Luna TTS (bootstrap.php / dev-api TTS). */
export const LUNA_LIVE_VOICE = 'Kore';

const AUTH_TOKENS_URL = 'https://generativelanguage.googleapis.com/v1alpha/auth_tokens';

function geminiErrorMessage(data, fallback = 'Gemini Live API call failed.') {
  if (data?.error?.message) return String(data.error.message);
  if (typeof data?.error === 'string') return data.error;
  return fallback;
}

function buildLiveTokenPayload(model, systemPrompt) {
  const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();

  return {
    expireTime,
    newSessionExpireTime,
    uses: 1,
    bidi_generate_content_setup: {
      model: `models/${model}`,
      generation_config: {
        response_modalities: ['AUDIO'],
        speech_config: {
          voice_config: {
            prebuilt_voice_config: { voice_name: LUNA_LIVE_VOICE },
          },
        },
      },
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      input_audio_transcription: {},
      output_audio_transcription: {},
    },
  };
}

/** @returns {Promise<{ token: string; model: string }>} */
export async function createLiveSessionToken(apiKey, systemPrompt) {
  let lastError = 'Could not create live session token.';

  for (const model of LIVE_MODELS) {
    const response = await fetch(AUTH_TOKENS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(buildLiveTokenPayload(model, systemPrompt)),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      lastError = geminiErrorMessage(data);
      continue;
    }

    const token = data.name ?? '';
    if (!token) {
      lastError = 'Empty live session token from Gemini.';
      continue;
    }

    return { token, model };
  }

  throw new Error(lastError);
}

export { LIVE_MODELS };
