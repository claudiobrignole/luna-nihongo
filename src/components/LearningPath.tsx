import React, { useEffect, useState } from 'react';
import { CURRICULUM_LEVELS, SYLLABUS } from '../data/curriculum';
import type { HydratedUnit, Quiz } from '../types/curriculum';
import { useJapaneseSpeech } from '../hooks/useJapaneseSpeech';
import {
  checkQuizAnswer,
  getDisplayCards,
  getGrammarPoints,
  getQuizOptionLabel,
  unitTypeLabel,
} from '../utils/curriculumDisplay';
import { WritingQuizPanel } from './WritingQuizPanel';
import { StrokeOrderQuizPanel } from './StrokeOrderQuizPanel';
import { HubFilterStack, HubFilterGrid } from './HubFilterGrid';
import type { WritingQuizExtended } from '../types/writingGrading';
import {
  BookOpen,
  CheckCircle,
  Trophy,
  X,
  Award,
  Volume2,
  Mic,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface LearningPathProps {
  language: 'en' | 'it';
  onCompleteUnit: (unitId: string) => void;
  completedUnits: string[];
  initialLevel?: number;
  onUnitOpen?: (unitId: string, level: number) => void;
  guestMode?: boolean;
  onRequireAuth?: () => void;
  onOpenOnboarding?: () => void;
  showRomaji?: boolean;
  onEarnQuizXp?: (xp: number) => void;
  onOpenCredits?: () => void;
}

export const LearningPath: React.FC<LearningPathProps> = ({
  language,
  onCompleteUnit,
  completedUnits,
  initialLevel = 0,
  onUnitOpen,
  guestMode = false,
  onRequireAuth,
  onOpenOnboarding,
  showRomaji = true,
  onEarnQuizXp,
  onOpenCredits,
}) => {
  const [activeLevel, setActiveLevel] = useState(initialLevel);

  useEffect(() => {
    setActiveLevel(initialLevel);
  }, [initialLevel]);
  const [selectedUnit, setSelectedUnit] = useState<HydratedUnit | null>(null);
  const [quizActive, setQuizActive] = useState<boolean>(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [spellingInput, setSpellingInput] = useState<string>('');
  const [matchingAnswers, setMatchingAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState<boolean>(false);
  const [shakeQuiz, setShakeQuiz] = useState<boolean>(false);

  const {
    speakJapanese,
    startSpeechRecognition,
    speechFeedback,
    activeMicItemId,
    speakingItemId,
    clearSpeechFeedback,
  } = useJapaneseSpeech({ language });

  const levelUnits = SYLLABUS.filter((u) => u.level === activeLevel);
  const completedInLevel = levelUnits.filter((u) => completedUnits.includes(u.id)).length;

  const handleUnitClick = (unit: HydratedUnit) => {
    if (guestMode) {
      onRequireAuth?.();
      return;
    }
    onUnitOpen?.(unit.id, unit.level);
    setSelectedUnit(unit);
    setQuizActive(false);
    setShowResult(false);
    clearSpeechFeedback();
  };

  const resetQuizInputs = () => {
    setSelectedOptionIndex(null);
    setSpellingInput('');
    setMatchingAnswers({});
  };

  const startQuiz = () => {
    setQuizActive(true);
    setCurrentQuizIndex(0);
    setShowResult(false);
    resetQuizInputs();
  };

  const advanceAfterCorrectQuiz = () => {
    if (!selectedUnit) return;
    if (currentQuizIndex + 1 < selectedUnit.quizzes.length) {
      setTimeout(() => {
        setCurrentQuizIndex((prev) => prev + 1);
        resetQuizInputs();
      }, 600);
    } else {
      setTimeout(() => {
        setShowResult(true);
        onCompleteUnit(selectedUnit.id);
      }, 600);
    }
  };

  const goToPreviousQuiz = () => {
    if (currentQuizIndex > 0) {
      setCurrentQuizIndex((prev) => prev - 1);
      resetQuizInputs();
    }
  };

  const handleAnswerSubmit = () => {
    if (!selectedUnit) return;
    const currentQuestion = selectedUnit.quizzes[currentQuizIndex];
    const isCorrect = checkQuizAnswer(
      currentQuestion,
      language,
      selectedOptionIndex,
      spellingInput,
      matchingAnswers,
    );

    if (isCorrect) {
      advanceAfterCorrectQuiz();
    } else {
      setShakeQuiz(true);
      setTimeout(() => setShakeQuiz(false), 500);
    }
  };

  const handleWritingQuizPassed = () => {
    advanceAfterCorrectQuiz();
  };

  const handleStrokeQuizPassed = () => {
    advanceAfterCorrectQuiz();
  };

  const currentQuiz: Quiz | undefined = selectedUnit?.quizzes[currentQuizIndex];
  const displayCards = selectedUnit ? getDisplayCards(selectedUnit, language) : [];
  const grammarPoints = selectedUnit ? getGrammarPoints(selectedUnit) : [];

  const isSubmitDisabled = () => {
    if (!currentQuiz) return true;
    if (currentQuiz.type === 'multiple-choice') return selectedOptionIndex === null;
    if (currentQuiz.type === 'spelling') return !spellingInput.trim();
    if (currentQuiz.type === 'matching') {
      return !currentQuiz.pairs.every((pair) => matchingAnswers[pair.left]);
    }
    if (currentQuiz.type === 'writing') return true;
    if (currentQuiz.type === 'stroke-order') return true;
    return true;
  };

  const activeLevelMeta = CURRICULUM_LEVELS.find((l) => l.level === activeLevel);

  return (
    <div className="study-hub page-view">
      <header className="study-hub-header">
        <div>
          <h2>{language === 'en' ? 'Studio' : 'Studio'}</h2>
          <p>
            {guestMode
              ? (language === 'en'
                ? 'Browse all levels freely. Open a unit after free registration to study with audio.'
                : 'Sfoglia tutti i livelli. Apri un\'unità dopo la registrazione gratuita per studiare con l\'audio.')
              : (language === 'en'
                ? 'Pick a level — every unit is open. Practice with audio on each card.'
                : 'Scegli un livello — tutte le unità sono aperte. Esercitati con l\'audio su ogni scheda.')}
          </p>
        </div>
        <div className="study-hub-header-actions">
          {onOpenOnboarding && !guestMode && (
            <button type="button" className="btn btn-secondary study-level-change-btn" onClick={onOpenOnboarding}>
              {language === 'en' ? 'Change level' : 'Cambia livello'}
            </button>
          )}
          <div className="study-hub-progress glass-panel">
            <strong>{completedInLevel}/{levelUnits.length}</strong>
            <span>{language === 'en' ? 'units in this level' : 'unità in questo livello'}</span>
          </div>
        </div>
      </header>

      <HubFilterStack>
        <HubFilterGrid
          label={language === 'en' ? 'Level' : 'Livello'}
          options={CURRICULUM_LEVELS.map((lvl) => ({
            value: lvl.level,
            label: lvl.title[language].replace(/^Livello \d+ · |^Level \d+ · /, ''),
          }))}
          value={activeLevel}
          onChange={setActiveLevel}
        />
      </HubFilterStack>

      {activeLevelMeta && (
        <p className="study-level-desc">{activeLevelMeta.description[language]}</p>
      )}

      <div className="study-unit-grid">
        {levelUnits.map((unit) => {
          const completed = completedUnits.includes(unit.id);
          return (
            <button
              key={unit.id}
              type="button"
              className={`study-unit-card glass-panel ${completed ? 'completed' : ''}`}
              onClick={() => handleUnitClick(unit)}
            >
              <span className={`study-unit-type type-${unit.type}`}>
                {unitTypeLabel(unit.type, language)}
              </span>
              <h3>{unit.title[language]}</h3>
              <p>{unit.description[language]}</p>
              {completed && (
                <span className="study-unit-done">
                  <CheckCircle size={14} />
                  {language === 'en' ? 'Done' : 'Fatto'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Unit Study Drawer / Modal Overlay */}
      {selectedUnit && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          zIndex: 200,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'stretch'
        }} onClick={() => setSelectedUnit(null)}>
          
          <div 
            style={{
              width: '100%',
              maxWidth: '550px',
              backgroundColor: 'var(--bg-app)',
              borderLeft: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              padding: '2rem 1.5rem',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
            className="drawer-content"
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span className={`study-unit-type type-${selectedUnit.type}`}>
                {unitTypeLabel(selectedUnit.type, language)}
              </span>
              <button onClick={() => setSelectedUnit(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={24} />
              </button>
            </div>

            <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem' }}>
              {selectedUnit.title[language]}
            </h2>

            {/* Quiz Screen vs Study Screen */}
            {!quizActive ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
                
                {/* Character/Vocabulary List */}
                {displayCards.length > 0 && (
                  <div>
                    <h3 style={{ marginBottom: '1rem' }}>
                      {language === 'en' ? 'Characters & Vocabulary' : 'Caratteri e Vocabolario'}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      {displayCards.map((item) => (
                        <div 
                          key={item.id}
                          className="glass-panel" 
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '1rem',
                            gap: '0.6rem',
                            borderLeft: '4px solid var(--primary)',
                            background: 'var(--bg-panel)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div className="ja-text" style={{
                              fontSize: '2.5rem',
                              fontWeight: '700',
                              width: '60px',
                              textAlign: 'center',
                              color: 'var(--primary)'
                            }}>
                              {item.japanese}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>
                                /{item.romaji}/
                              </div>
                              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                {item.label}
                              </div>
                              {item.extra && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                                  {item.extra}
                                </div>
                              )}
                            </div>

                            {/* Vocal Controls */}
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button 
                                onClick={() => void speakJapanese(item.japanese, item.id)}
                                disabled={speakingItemId !== null}
                                style={{
                                  padding: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--primary-glow)',
                                  color: 'var(--primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  opacity: speakingItemId === item.id ? 0.6 : 1,
                                }}
                                title={language === 'en' ? 'Listen pronunciation' : 'Ascolta pronuncia'}
                              >
                                {speakingItemId === item.id ? <Loader2 size={16} className="spin" /> : <Volume2 size={16} />}
                              </button>

                              <button 
                                onClick={() => startSpeechRecognition(item.id, item.japanese, item.romaji)}
                                style={{
                                  padding: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: activeMicItemId === item.id ? 'var(--error-glow)' : 'var(--border)',
                                  color: activeMicItemId === item.id ? 'var(--error)' : 'var(--text-main)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  animation: activeMicItemId === item.id ? 'pulse 1.2s infinite' : 'none'
                                }}
                                title={language === 'en' ? 'Practice Speaking' : 'Esercitati a parlare'}
                              >
                                <Mic size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Speech feedback alert inside item */}
                          {speechFeedback && speechFeedback.itemId === item.id && (
                            <div style={{
                              fontSize: '0.8rem',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              fontWeight: 600,
                              backgroundColor: speechFeedback.status === 'success' 
                                ? 'var(--success-glow)' 
                                : speechFeedback.status === 'listening'
                                  ? 'var(--primary-glow)'
                                  : 'var(--error-glow)',
                              color: speechFeedback.status === 'success' 
                                ? 'var(--success)' 
                                : speechFeedback.status === 'listening'
                                  ? 'var(--primary)'
                                  : 'var(--error)'
                            }}>
                              {speechFeedback.status === 'success' && <Check size={14} />}
                              {speechFeedback.status === 'fail' && <AlertCircle size={14} />}
                              <span>{speechFeedback.text}</span>
                            </div>
                          )}

                          {item.mnemonic && (
                            <div style={{ 
                              fontSize: '0.8rem', 
                              color: 'var(--accent)', 
                              fontStyle: 'italic',
                              backgroundColor: 'var(--accent-light)',
                              padding: '4px 8px',
                              borderRadius: '6px'
                            }}>
                              💡 {item.mnemonic[language]}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grammar Explanation */}
                {grammarPoints.map((grammarPoint) => (
                  <div key={grammarPoint.id} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ color: 'var(--secondary)' }}>{grammarPoint.title[language]}</h3>
                    <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>
                      {grammarPoint.explanation[language]}
                    </p>

                    <h4 style={{ marginTop: '0.5rem' }}>{language === 'en' ? 'Examples' : 'Esempi'}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      {grammarPoint.examples.map((example, i) => (
                        <div 
                          key={i} 
                          className="glass-panel" 
                          style={{
                            padding: '1rem',
                            borderLeft: '4px solid var(--secondary)',
                            backgroundColor: 'var(--bg-input)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="ja-text" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>
                              {example.japanese}
                            </div>
                            <button 
                              onClick={() => void speakJapanese(example.japanese, `ex-${i}`)}
                              disabled={speakingItemId !== null}
                              style={{
                                padding: '6px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(155, 89, 182, 0.1)',
                                color: 'var(--secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: speakingItemId === `ex-${i}` ? 0.6 : 1,
                              }}
                              title={language === 'en' ? 'Listen' : 'Ascolta'}
                            >
                              {speakingItemId === `ex-${i}` ? <Loader2 size={16} className="spin" /> : <Volume2 size={16} />}
                            </button>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {example.romaji}
                          </div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                            {example.translation[language]}
                          </div>
                          {example.note && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
                              {example.note[language]}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Bottom CTA to start quiz */}
                <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                  <button 
                    onClick={startQuiz}
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                  >
                    <BookOpen size={20} />
                    {language === 'en' ? 'Start Lesson Quiz' : 'Inizia il Quiz della Lezione'}
                  </button>
                </div>
              </div>
            ) : (
              /* Quiz Section */
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                
                {/* Result Dashboard */}
                {showResult ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    textAlign: 'center',
                    gap: '1rem'
                  }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'var(--primary-glow)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Trophy size={48} />
                    </div>
                    <h2>
                      {language === 'en' ? 'Lesson Completed!' : 'Lezione Completata!'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)' }}>
                      {language === 'en' 
                        ? `Congratulations! You answered all questions correctly for ${selectedUnit.title[language]}.`
                        : `Congratulazioni! Hai risposto correttamente a tutte le domande per ${selectedUnit.title[language]}.`}
                    </p>
                    <div style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      backgroundColor: 'var(--success-glow)',
                      color: 'var(--success)',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      marginTop: '0.5rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <Award size={18} />
                      {language === 'en' ? '+10 XP • New cards added to your Deck' : '+10 XP • Nuove carte aggiunte al tuo Deck'}
                    </div>

                    <button 
                      onClick={() => setSelectedUnit(null)}
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: '2rem' }}
                    >
                      {language === 'en' ? 'Back to Pathway' : 'Torna al Percorso'}
                    </button>
                  </div>
                ) : (
                  /* Active Quiz Question */
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    flex: 1,
                    animation: shakeQuiz ? 'shake 0.5s ease-in-out' : 'none'
                  }}>
                    {/* Progress Bar */}
                    <div style={{ 
                      height: '6px', 
                      width: '100%', 
                      backgroundColor: 'var(--border)', 
                      borderRadius: '3px',
                      marginBottom: '2rem',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${((currentQuizIndex) / selectedUnit.quizzes.length) * 100}%`,
                        backgroundColor: 'var(--primary)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      {language === 'en' ? `Question ${currentQuizIndex + 1} of ${selectedUnit.quizzes.length}` : `Domanda ${currentQuizIndex + 1} di ${selectedUnit.quizzes.length}`}
                    </div>

                    <h3 style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>
                      {currentQuiz?.prompt[language]}
                    </h3>

                    {currentQuiz?.type === 'stroke-order' && selectedUnit ? (
                      <StrokeOrderQuizPanel
                        key={currentQuiz.id}
                        quiz={currentQuiz}
                        unit={selectedUnit}
                        language={language}
                        onPassed={handleStrokeQuizPassed}
                        onEarnXp={guestMode ? undefined : onEarnQuizXp}
                        onCancel={() => setQuizActive(false)}
                        onPrevious={currentQuizIndex > 0 ? goToPreviousQuiz : undefined}
                        onOpenCredits={onOpenCredits ?? (() => {})}
                      />
                    ) : currentQuiz?.type === 'writing' ? (
                      <WritingQuizPanel
                        key={currentQuiz.id}
                        quiz={currentQuiz as WritingQuizExtended}
                        language={language}
                        showRomaji={showRomaji}
                        onPassed={handleWritingQuizPassed}
                        onEarnXp={guestMode ? undefined : onEarnQuizXp}
                        onCancel={() => setQuizActive(false)}
                      />
                    ) : currentQuiz?.type === 'multiple-choice' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem' }}>
                        {currentQuiz.options.map((option, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedOptionIndex(index)}
                            style={{
                              padding: '1rem',
                              borderRadius: '12px',
                              border: selectedOptionIndex === index
                                ? '2px solid var(--primary)'
                                : '1px solid var(--border)',
                              backgroundColor: selectedOptionIndex === index
                                ? 'var(--primary-glow)'
                                : 'var(--bg-input)',
                              textAlign: 'left',
                              fontSize: '1rem',
                              fontWeight: 600,
                              color: 'var(--text-main)',
                              transition: 'all var(--transition-fast)'
                            }}
                          >
                            {getQuizOptionLabel(option, language)}
                          </button>
                        ))}
                      </div>
                    ) : currentQuiz?.type === 'matching' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                        {currentQuiz.pairs.map((pair) => {
                          const rightOptions = [...new Set(currentQuiz.pairs.map((p) => p.right))];
                          return (
                            <div key={pair.left} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                              <span className="ja-text" style={{ minWidth: '3rem', fontWeight: 700 }}>{pair.left}</span>
                              <select
                                value={matchingAnswers[pair.left] ?? ''}
                                onChange={(e) => setMatchingAnswers((prev) => ({ ...prev, [pair.left]: e.target.value }))}
                                style={{
                                  flex: 1,
                                  minWidth: '120px',
                                  padding: '0.75rem',
                                  borderRadius: '10px',
                                  border: '1px solid var(--border)',
                                  backgroundColor: 'var(--bg-input)',
                                  color: 'var(--text-main)',
                                }}
                              >
                                <option value="">{language === 'en' ? 'Select…' : 'Scegli…'}</option>
                                {rightOptions.map((right) => (
                                  <option key={right} value={right}>{right}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Spelling/Text Input Question */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem' }}>
                        <input
                          type="text"
                          value={spellingInput}
                          onChange={(e) => setSpellingInput(e.target.value)}
                          placeholder={language === 'en' ? 'Type spelling here...' : 'Scrivi la risposta qui...'}
                          style={{
                            padding: '1rem',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-input)',
                            fontSize: '1.1rem',
                            color: 'var(--text-main)'
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAnswerSubmit();
                          }}
                        />
                      </div>
                    )}

                    {currentQuiz?.type !== 'writing' && currentQuiz?.type !== 'stroke-order' && (
                      <div style={{ marginTop: 'auto', display: 'flex', gap: '1rem' }}>
                        <button
                          onClick={() => setQuizActive(false)}
                          className="btn btn-secondary"
                          style={{ flex: 1 }}
                        >
                          {language === 'en' ? 'Cancel' : 'Annulla'}
                        </button>
                        <button
                          onClick={handleAnswerSubmit}
                          className="btn btn-primary"
                          style={{ flex: 1 }}
                          disabled={isSubmitDisabled()}
                        >
                          {language === 'en' ? 'Submit Answer' : 'Invia Risposta'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Embedded CSS Animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.4); }
          70% { transform: scale(1.08); box-shadow: 0 0 0 8px rgba(231, 76, 60, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
        }
      `}</style>
    </div>
  );
};
