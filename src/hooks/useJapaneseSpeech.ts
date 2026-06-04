import { useCallback, useState } from 'react';
import { speakJapaneseText, stopJapaneseSpeech, type TTSSource } from '../services/ttsService';
import { matchesJapaneseSpeech } from '../utils/speechMatch';

export type SpeechFeedbackStatus = 'idle' | 'listening' | 'success' | 'fail';

export interface SpeechFeedback {
  itemId: string;
  status: SpeechFeedbackStatus;
  text: string;
}

interface UseJapaneseSpeechOptions {
  language: 'en' | 'it';
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

interface SpeechRecognitionEventLike {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
}

export function useJapaneseSpeech({ language }: UseJapaneseSpeechOptions) {
  const [speechFeedback, setSpeechFeedback] = useState<SpeechFeedback | null>(null);
  const [activeMicItemId, setActiveMicItemId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastTtsSource, setLastTtsSource] = useState<TTSSource | null>(null);

  const clearSpeechFeedback = useCallback(() => {
    setSpeechFeedback(null);
    setActiveMicItemId(null);
  }, []);

  const speakJapanese = useCallback(async (text: string, itemId = '_audio') => {
    setIsSpeaking(true);
    clearSpeechFeedback();
    try {
      const result = await speakJapaneseText(text, language);
      if ('source' in result) {
        setLastTtsSource(result.source);
      } else {
        setLastTtsSource(null);
        const detail = result.detail ? ` (${result.detail})` : '';
        setSpeechFeedback({
          itemId,
          status: 'fail',
          text:
            language === 'en'
              ? `Audio unavailable.${detail} Run "npm run dev:api" locally or check GEMINI_API_KEY on the server.`
              : `Audio non disponibile.${detail} In locale avvia "npm run dev:api" o verifica GEMINI_API_KEY sul server.`,
        });
      }
    } finally {
      setIsSpeaking(false);
    }
  }, [language, clearSpeechFeedback]);

  /** Free-form dictation (e.g. tutor conversation) — puts transcript in callback. */
  const listenForTranscript = useCallback(
    (itemId: string, onTranscript: (text: string) => void) => {
      const win = window as Window & {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      };
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        alert(
          language === 'en'
            ? 'Speech recognition is not supported in this browser. Please use Chrome or Safari.'
            : 'Il riconoscimento vocale non è supportato in questo browser. Usa Chrome o Safari.'
        );
        return;
      }

      stopJapaneseSpeech();

      setSpeechFeedback({
        itemId,
        status: 'listening',
        text: language === 'en' ? 'Listening… speak in Japanese or Italian' : 'Ascolto… parla in giapponese o italiano',
      });
      setActiveMicItemId(itemId);

      const recognition = new SpeechRecognition() as SpeechRecognitionLike;
      recognition.lang = 'ja-JP';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        const transcript = event.results[0][0].transcript.trim();
        if (transcript) onTranscript(transcript);
        setSpeechFeedback({
          itemId,
          status: 'success',
          text:
            language === 'en'
              ? `Heard: "${transcript}"`
              : `Sentito: "${transcript}"`,
        });
      };

      recognition.onerror = () => {
        setSpeechFeedback({
          itemId,
          status: 'fail',
          text: language === 'en' ? 'Microphone error. Try again!' : 'Errore del microfono. Riprova!',
        });
      };

      recognition.onend = () => {
        setActiveMicItemId(null);
      };

      recognition.start();
    },
    [language]
  );

  const startSpeechRecognition = useCallback(
    (itemId: string, targetJa: string, targetRomaji: string) => {
      const win = window as Window & {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      };
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        alert(
          language === 'en'
            ? 'Speech recognition is not supported in this browser. Please use Chrome or Safari.'
            : 'Il riconoscimento vocale non è supportato in questo browser. Usa Chrome o Safari.'
        );
        return;
      }

      stopJapaneseSpeech();

      setSpeechFeedback({
        itemId,
        status: 'listening',
        text: language === 'en' ? 'Listening... Speak now!' : 'Ascolto... Parla ora!',
      });
      setActiveMicItemId(itemId);

      const recognition = new SpeechRecognition() as SpeechRecognitionLike;
      recognition.lang = 'ja-JP';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        const transcript = event.results[0][0].transcript;
        const isMatch = matchesJapaneseSpeech(transcript, targetJa, targetRomaji);

        setSpeechFeedback({
          itemId,
          status: isMatch ? 'success' : 'fail',
          text: isMatch
            ? language === 'en'
              ? `Perfect! Heard: "${transcript}"`
              : `Ottimo! Sentito: "${transcript}"`
            : language === 'en'
              ? `Not quite. Heard: "${transcript}". Try again!`
              : `Non corrisponde. Sentito: "${transcript}". Riprova!`,
        });
      };

      recognition.onerror = () => {
        setSpeechFeedback({
          itemId,
          status: 'fail',
          text: language === 'en' ? 'Microphone error. Try again!' : 'Errore del microfono. Riprova!',
        });
      };

      recognition.onend = () => {
        setActiveMicItemId(null);
      };

      recognition.start();
    },
    [language]
  );

  return {
    speakJapanese,
    listenForTranscript,
    startSpeechRecognition,
    speechFeedback,
    activeMicItemId,
    isSpeaking,
    lastTtsSource,
    clearSpeechFeedback,
  };
}
