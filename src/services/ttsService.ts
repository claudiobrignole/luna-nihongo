export type TTSSource = 'static' | 'gemini';

let activeAudio: HTMLAudioElement | null = null;
let activeBlobUrl: string | null = null;

function stopCurrentPlayback(): void {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio.removeAttribute('src');
    activeAudio.load();
    activeAudio = null;
  }

  if (activeBlobUrl) {
    URL.revokeObjectURL(activeBlobUrl);
    activeBlobUrl = null;
  }
}

function playUrlAudio(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    activeAudio = audio;
    audio.onended = () => {
      stopCurrentPlayback();
      resolve();
    };
    audio.onerror = () => {
      stopCurrentPlayback();
      reject(new Error('Audio playback failed'));
    };
    void audio.play().catch((err) => {
      stopCurrentPlayback();
      reject(err);
    });
  });
}

function playBase64Audio(base64: string, mimeType: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      activeBlobUrl = URL.createObjectURL(blob);
      const audio = new Audio(activeBlobUrl);
      activeAudio = audio;
      audio.onended = () => {
        stopCurrentPlayback();
        resolve();
      };
      audio.onerror = () => {
        stopCurrentPlayback();
        reject(new Error('Audio playback failed'));
      };
      void audio.play().catch((err) => {
        stopCurrentPlayback();
        reject(err);
      });
    } catch {
      reject(new Error('Invalid audio data'));
    }
  });
}

export type SpeakResult = { source: TTSSource } | { error: string; detail?: string };

type TtsErrorPayload = {
  error?: string;
  status?: number;
  model?: string;
};

/** Human-readable TTS failure (proxy down, missing API key, Gemini error). */
export function formatTtsFailure(
  response: Response,
  data: TtsErrorPayload,
  language: 'en' | 'it' = 'it',
): string {
  if (data.error) {
    const extra = [
      data.model ? `model: ${data.model}` : '',
      data.status ? `[${data.status}]` : '',
    ]
      .filter(Boolean)
      .join(' ');
    return extra ? `${data.error} ${extra}` : data.error;
  }

  if (response.status === 500) {
    return language === 'en'
      ? 'API key not configured on server (GEMINI_API_KEY).'
      : 'Chiave API non configurata sul server (GEMINI_API_KEY).';
  }

  if (response.status === 502 || response.status === 503 || response.status === 504) {
    return language === 'en'
      ? 'Voice server unreachable. Locally run "npm run dev:api" in a second terminal; on Hostinger check GEMINI_API_KEY and redeploy.'
      : 'Server voce non raggiungibile. In locale avvia "npm run dev:api" in un secondo terminale; su Hostinger verifica GEMINI_API_KEY e rifai il deploy.';
  }

  return `HTTP ${response.status}`;
}

/** Pre-generated curriculum audio (LearningPath, dialogues, flashcards). */
export async function speakCurriculumJapanese(
  stableId: string,
  text: string,
  language: 'en' | 'it' = 'it',
): Promise<SpeakResult> {
  const trimmed = text.trim();
  if (!trimmed) return { error: 'Empty text' };

  stopCurrentPlayback();

  const { loadCurriculumAudioManifest, resolveCurriculumAudioUrlAsync } = await import(
    '../utils/curriculumAudio'
  );
  const manifest = await loadCurriculumAudioManifest();
  if (manifest) {
    const url = await resolveCurriculumAudioUrlAsync(manifest, stableId, trimmed);
    if (url) {
      try {
        await playUrlAudio(url);
        return { source: 'static' };
      } catch {
        console.warn('[tts] static audio playback failed, falling back to Gemini', stableId);
      }
    }
  }

  return speakJapaneseText(trimmed, language);
}

/** Japanese speech via Gemini TTS (tutor chat only). */
export async function speakJapaneseText(
  text: string,
  language: 'en' | 'it' = 'it',
): Promise<SpeakResult> {
  const trimmed = text.trim();
  if (!trimmed) return { error: 'Empty text' };

  stopCurrentPlayback();

  try {
    const response = await fetch('/api/tts.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed, language: 'ja-JP' }),
    });

    const data = (await response.json().catch(() => ({}))) as TtsErrorPayload & {
      audioBase64?: string;
      mimeType?: string;
    };

    if (response.ok && data.audioBase64) {
      await playBase64Audio(data.audioBase64, data.mimeType ?? 'audio/wav');
      return { source: 'gemini' };
    }

    return { error: 'Gemini audio unavailable', detail: formatTtsFailure(response, data, language) };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Network error';
    return { error: 'Gemini audio unavailable', detail };
  }
}

export function stopJapaneseSpeech(): void {
  stopCurrentPlayback();
}

/** Strip markup for TTS of tutor replies (keep Japanese segments). */
export function extractJapaneseForSpeech(text: string): string {
  const jaChunks = text.match(/[\u3040-\u30FF\u4E00-\u9FFF\u3000-\u303F]+/g);
  if (jaChunks && jaChunks.join('').length >= 2) {
    return jaChunks.join(' ').slice(0, 120);
  }
  return text.replace(/[*_#`]/g, '').slice(0, 120);
}
