import { useCallback, useRef, useState } from 'react';
import { AlertCircle, Check, Loader2, Mic, Play, Square, Volume2 } from 'lucide-react';
import type { DialogueScene } from '../types/curriculum';
import type { SpeechFeedback } from '../hooks/useJapaneseSpeech';
import { stopJapaneseSpeech } from '../services/ttsService';
import { dialogueLineId, getSpeakerLabel } from '../utils/dialogueDisplay';

interface DialogueStudyPanelProps {
  language: 'en' | 'it';
  dialogues: DialogueScene[];
  showRomaji?: boolean;
  speakJapanese: (text: string, itemId: string) => Promise<void>;
  startSpeechRecognition: (itemId: string, targetJa: string, targetRomaji: string) => void;
  speechFeedback: SpeechFeedback | null;
  activeMicItemId: string | null;
  speakingItemId: string | null;
}

export function DialogueStudyPanel({
  language,
  dialogues,
  showRomaji = true,
  speakJapanese,
  startSpeechRecognition,
  speechFeedback,
  activeMicItemId,
  speakingItemId,
}: DialogueStudyPanelProps) {
  const [playingSceneId, setPlayingSceneId] = useState<string | null>(null);
  const stopSequenceRef = useRef(false);

  const playScene = useCallback(
    async (scene: DialogueScene) => {
      stopSequenceRef.current = false;
      setPlayingSceneId(scene.id);
      stopJapaneseSpeech();

      for (let i = 0; i < scene.lines.length; i += 1) {
        if (stopSequenceRef.current) break;
        const line = scene.lines[i];
        await speakJapanese(line.japanese, dialogueLineId(scene.id, i));
      }

      setPlayingSceneId(null);
    },
    [speakJapanese],
  );

  const stopScene = useCallback(() => {
    stopSequenceRef.current = true;
    stopJapaneseSpeech();
    setPlayingSceneId(null);
  }, []);

  if (dialogues.length === 0) return null;

  return (
    <div className="dialogue-study">
      <h3 className="dialogue-study-heading">
        {language === 'en' ? 'Dialogue' : 'Dialogo'}
      </h3>

      {dialogues.map((scene) => {
        const isScenePlaying = playingSceneId === scene.id;
        const sceneBusy = isScenePlaying || speakingItemId?.startsWith(`${scene.id}-`) === true;

        return (
          <section key={scene.id} className="dialogue-scene glass-panel">
            <header className="dialogue-scene-header">
              <div>
                <h4 className="dialogue-scene-title">{scene.title[language]}</h4>
                <p className="dialogue-scene-setting">{scene.setting[language]}</p>
              </div>
              <div className="dialogue-scene-actions">
                {isScenePlaying ? (
                  <button
                    type="button"
                    className="btn btn-secondary dialogue-scene-play-btn"
                    onClick={stopScene}
                  >
                    <Square size={16} />
                    {language === 'en' ? 'Stop' : 'Stop'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary dialogue-scene-play-btn"
                    onClick={() => void playScene(scene)}
                    disabled={sceneBusy && !isScenePlaying}
                  >
                    {sceneBusy ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
                    {language === 'en' ? 'Play all' : 'Ascolta tutto'}
                  </button>
                )}
              </div>
            </header>

            <div className="dialogue-lines" role="list">
              {scene.lines.map((line, lineIndex) => {
                const lineId = dialogueLineId(scene.id, lineIndex);
                const speakerSide = line.speaker === 'B' ? 'right' : 'left';
                const isSpeaking = speakingItemId === lineId;
                const isMicActive = activeMicItemId === lineId;
                const lineFeedback =
                  speechFeedback && speechFeedback.itemId === lineId ? speechFeedback : null;

                return (
                  <article
                    key={lineId}
                    className={`dialogue-line dialogue-line--${speakerSide}`}
                    role="listitem"
                  >
                    <div className="dialogue-line-meta">
                      <span className="dialogue-speaker">{getSpeakerLabel(line, language)}</span>
                    </div>
                    <div className="dialogue-bubble">
                      <p className="dialogue-japanese ja-text">{line.japanese}</p>
                      {showRomaji && (
                        <p className="dialogue-romaji">{line.romaji}</p>
                      )}
                      <p className="dialogue-translation">{line.translation[language]}</p>
                      {line.note && (
                        <p className="dialogue-note">{line.note[language]}</p>
                      )}

                      <div className="dialogue-line-controls">
                        <button
                          type="button"
                          className="dialogue-control-btn"
                          onClick={() => void speakJapanese(line.japanese, lineId)}
                          disabled={speakingItemId !== null && !isSpeaking}
                          title={language === 'en' ? 'Listen' : 'Ascolta'}
                          aria-label={language === 'en' ? 'Listen' : 'Ascolta'}
                        >
                          {isSpeaking ? (
                            <Loader2 size={16} className="spin" />
                          ) : (
                            <Volume2 size={16} />
                          )}
                        </button>
                        <button
                          type="button"
                          className={`dialogue-control-btn ${isMicActive ? 'dialogue-control-btn--mic-active' : ''}`}
                          onClick={() => startSpeechRecognition(lineId, line.japanese, line.romaji)}
                          disabled={activeMicItemId !== null && !isMicActive}
                          title={language === 'en' ? 'Practice speaking' : 'Esercitati a parlare'}
                          aria-label={language === 'en' ? 'Practice speaking' : 'Esercitati a parlare'}
                        >
                          <Mic size={16} />
                        </button>
                      </div>

                      {lineFeedback && (
                        <div
                          className={`dialogue-speech-feedback dialogue-speech-feedback--${lineFeedback.status}`}
                        >
                          {lineFeedback.status === 'success' && <Check size={14} />}
                          {lineFeedback.status === 'fail' && <AlertCircle size={14} />}
                          <span>{lineFeedback.text}</span>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
