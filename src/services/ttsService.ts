export type TTSSource = 'gemini' | 'browser';

let activeAudio: HTMLAudioElement | null = null;

function stopCurrentPlayback(): void {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = '';
    activeAudio = null;
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function loadVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices();
}

function speakWithBrowserTTS(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';

    const assignVoice = () => {
      const voices = loadVoices();
      const jaVoice = voices.find((voice) => voice.lang.toLowerCase().includes('ja'));
      if (jaVoice) utterance.voice = jaVoice;
    };

    assignVoice();
    if (loadVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        assignVoice();
        window.speechSynthesis.onvoiceschanged = null;
      };
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error('Browser TTS failed'));
    window.speechSynthesis.speak(utterance);
  });
}

function playBase64Audio(base64: string, mimeType: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(`data:${mimeType};base64,${base64}`);
    activeAudio = audio;
    audio.onended = () => {
      if (activeAudio === audio) activeAudio = null;
      resolve();
    };
    audio.onerror = () => reject(new Error('Audio playback failed'));
    void audio.play().catch(reject);
  });
}

export async function speakJapaneseText(text: string): Promise<TTSSource> {
  const trimmed = text.trim();
  if (!trimmed) return 'browser';

  stopCurrentPlayback();

  try {
    const response = await fetch('/api/tts.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed, language: 'ja-JP' }),
    });

    if (!response.ok) {
      throw new Error(`TTS proxy failed (${response.status})`);
    }

    const data = await response.json();
    if (!data.audioBase64) {
      throw new Error('TTS response missing audio');
    }

    await playBase64Audio(data.audioBase64, data.mimeType ?? 'audio/wav');
    return 'gemini';
  } catch {
    await speakWithBrowserTTS(trimmed);
    return 'browser';
  }
}

export function stopJapaneseSpeech(): void {
  stopCurrentPlayback();
}
