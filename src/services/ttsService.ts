export type TTSSource = 'gemini';

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

/** Japanese speech via Gemini TTS only (no browser fallback). */
export async function speakJapaneseText(text: string): Promise<SpeakResult> {
  const trimmed = text.trim();
  if (!trimmed) return { error: 'Empty text' };

  stopCurrentPlayback();

  try {
    const response = await fetch('/api/tts.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed, language: 'ja-JP' }),
    });

    const data = await response.json().catch(() => ({})) as {
      audioBase64?: string;
      mimeType?: string;
      error?: string;
      status?: number;
      model?: string;
    };

    if (response.ok && data.audioBase64) {
      await playBase64Audio(data.audioBase64, data.mimeType ?? 'audio/wav');
      return { source: 'gemini' };
    }

    const detail = data.error
      ? `${data.error}${data.model ? ` (${data.model})` : ''}${data.status ? ` [${data.status}]` : ''}`
      : `HTTP ${response.status}`;

    return { error: 'Gemini audio unavailable', detail };
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
