import { GoogleGenAI, Modality } from '@google/genai';
import { LIVE_MODEL, LIVE_MODEL_FALLBACKS } from './liveLimits';

function geminiErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { message?: string; error?: { message?: string } };
    return e.error?.message ?? e.message ?? 'Unknown Gemini error';
  }
  return String(err);
}

async function createTokenForModel(
  client: GoogleGenAI,
  model: string,
  systemInstruction: string,
): Promise<string> {
  const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();

  const token = await client.authTokens.create({
    config: {
      expireTime,
      newSessionExpireTime,
      uses: 1,
      liveConnectConstraints: {
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      },
      httpOptions: { apiVersion: 'v1alpha' },
    },
  });

  return token.name ?? '';
}

export async function createLiveSessionToken(
  apiKey: string,
  systemInstruction: string,
): Promise<{ token: string; model: string }> {
  const client = new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: 'v1alpha' },
  });

  const models = [LIVE_MODEL, ...LIVE_MODEL_FALLBACKS.filter((m) => m !== LIVE_MODEL)];
  let lastError = 'Unknown error';

  for (const model of models) {
    try {
      const tokenName = await createTokenForModel(client, model, systemInstruction);
      if (tokenName) {
        return { token: tokenName, model };
      }
      lastError = 'Empty live session token';
    } catch (err) {
      lastError = geminiErrorMessage(err);
      console.error(`authTokens.create failed for ${model}:`, lastError);
    }
  }

  throw new Error(lastError);
}
