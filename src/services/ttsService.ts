export type TTSSource = 'gemini' | 'browser';

let activeAudio: HTMLAudioElement | null = null;
let activeBlobUrl: string | null = null;
let voicesReady = false;

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

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function ensureVoicesLoaded(): Promise<void> {
  if (!('speechSynthesis' in window)) return Promise.resolve();
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    voicesReady = true;
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const onVoices = () => {
      voicesReady = true;
      window.speechSynthesis.onvoiceschanged = null;
      resolve();
    };
    window.speechSynthesis.onvoiceschanged = onVoices;
    window.setTimeout(() => {
      if (!voicesReady) {
        window.speechSynthesis.onvoiceschanged = null;
        resolve();
      }
    }, 800);
  });
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  void ensureVoicesLoaded();
}

function loadVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices();
}

/** Start browser TTS synchronously (required for Safari user-gesture rules). */
function startBrowserTTSImmediate(text: string): SpeechSynthesisUtterance | null {
  if (!('speechSynthesis' in window)) return null;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  utterance.rate = 0.92;

  const voices = loadVoices();
  const jaVoice =
    voices.find((v) => v.lang === 'ja-JP') ??
    voices.find((v) => v.lang.toLowerCase().startsWith('ja')) ??
    null;
  if (jaVoice) utterance.voice = jaVoice;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return utterance;
}

function waitForBrowserUtterance(utterance: SpeechSynthesisUtterance): Promise<void> {
  return new Promise((resolve, reject) => {
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error('Browser TTS failed'));
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

export async function speakJapaneseText(text: string): Promise<SpeakResult> {
  const trimmed = text.trim();
  if (!trimmed) return { error: 'Empty text' };

  stopCurrentPlayback();

  // Safari/iOS: speech must start in the same user-gesture tick; cancel if Gemini succeeds.
  const browserUtterance = startBrowserTTSImmediate(trimmed);

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
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      await playBase64Audio(data.audioBase64, data.mimeType ?? 'audio/wav');
      return { source: 'gemini' };
    }

    const detail = data.error
      ? `${data.error}${data.model ? ` (${data.model})` : ''}${data.status ? ` [${data.status}]` : ''}`
      : `HTTP ${response.status}`;

    if (browserUtterance) {
      try {
        await waitForBrowserUtterance(browserUtterance);
        return { source: 'browser' };
      } catch {
        return { error: 'Audio unavailable', detail };
      }
    }

    return { error: 'Audio unavailable', detail };
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Network error';

    if (browserUtterance) {
      try {
        await waitForBrowserUtterance(browserUtterance);
        return { source: 'browser' };
      } catch {
        return { error: 'Audio unavailable', detail };
      }
    }

    return { error: 'Audio unavailable', detail };
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
