import React, { useState } from 'react';
import { SYLLABUS } from '../data/lessons';
import type { SyllabusUnit } from '../data/lessons';
import { useJapaneseSpeech } from '../hooks/useJapaneseSpeech';
import { 
  BookOpen, 
  CheckCircle, 
  Lock, 
  Trophy, 
  X, 
  ArrowRight, 
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
}

const LEVELS = [
  {
    level: 0,
    title: {
      en: 'Level 0: The Writing Systems',
      it: 'Livello 0: Primi Passi (Kana)'
    },
    description: {
      en: 'Learn the foundational Japanese alphabets: Hiragana and Katakana.',
      it: 'Impara gli alfabeti fondamentali del giapponese: Hiragana e Katakana.'
    }
  },
  {
    level: 1,
    title: {
      en: 'Level 1: Basic Kanji & Grammar',
      it: 'Livello 1: Kanji e Grammatica Base'
    },
    description: {
      en: 'Master initial ideograms and learn to build basic sentences.',
      it: 'Padroneggia i primi ideogrammi e impara a strutturare le prime frasi.'
    }
  }
];

export const LearningPath: React.FC<LearningPathProps> = ({
  language,
  onCompleteUnit,
  completedUnits,
}) => {
  const [selectedUnit, setSelectedUnit] = useState<SyllabusUnit | null>(null);
  const [quizActive, setQuizActive] = useState<boolean>(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [spellingInput, setSpellingInput] = useState<string>('');
  const [showResult, setShowResult] = useState<boolean>(false);
  const [shakeQuiz, setShakeQuiz] = useState<boolean>(false);

  const {
    speakJapanese,
    startSpeechRecognition,
    speechFeedback,
    activeMicItemId,
    isSpeaking,
    clearSpeechFeedback,
  } = useJapaneseSpeech({ language });

  const isUnlocked = (index: number) => {
    if (index === 0) return true;
    return completedUnits.includes(SYLLABUS[index - 1].id);
  };

  const handleUnitClick = (unit: SyllabusUnit, index: number) => {
    if (!isUnlocked(index)) return;
    setSelectedUnit(unit);
    setQuizActive(false);
    setShowResult(false);
    clearSpeechFeedback();
  };

  const startQuiz = () => {
    setQuizActive(true);
    setCurrentQuizIndex(0);
    setShowResult(false);
    setSelectedOption(null);
    setSpellingInput('');
  };

  const handleAnswerSubmit = () => {
    if (!selectedUnit) return;
    const currentQuestion = selectedUnit.quizzes[currentQuizIndex];
    let isCorrect = false;

    if (currentQuestion.type === 'multiple-choice') {
      isCorrect = selectedOption === currentQuestion.correctAnswer;
    } else if (currentQuestion.type === 'spelling') {
      isCorrect = spellingInput.trim().toLowerCase() === currentQuestion.correctAnswer.toLowerCase();
    }

    if (isCorrect) {
      if (currentQuizIndex + 1 < selectedUnit.quizzes.length) {
        setTimeout(() => {
          setCurrentQuizIndex(prev => prev + 1);
          setSelectedOption(null);
          setSpellingInput('');
        }, 600);
      } else {
        setTimeout(() => {
          setShowResult(true);
          onCompleteUnit(selectedUnit.id);
        }, 600);
      }
    } else {
      setShakeQuiz(true);
      setTimeout(() => setShakeQuiz(false), 500);
    }
  };

  return (
    <div className="learning-path-view">
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>
          {language === 'en' ? 'Your Japanese Journey' : 'Il Tuo Viaggio Giapponese'}
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          {language === 'en' 
            ? 'Complete levels sequentially, practice pronunciation, and climb your way to advanced vocabulary!'
            : 'Completa i livelli in sequenza, esercita la pronuncia e scala la vetta verso il giapponese fluente!'}
        </p>
      </div>

      {/* Grouped Levels Display */}
      <div className="levels-container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '3rem',
        width: '100%',
        padding: '1rem 0'
      }}>
        {LEVELS.map((levelObj) => {
          const levelUnits = SYLLABUS.filter(u => u.level === levelObj.level);
          
          return (
            <div key={levelObj.level} style={{ width: '100%', maxWidth: '550px' }}>
              {/* Level Header Banner */}
              <div className="glass-panel" style={{
                padding: '1.2rem',
                borderRadius: '18px',
                borderLeft: '5px solid var(--primary)',
                marginBottom: '1.5rem',
                background: 'var(--bg-panel)',
                boxShadow: 'var(--glass-shadow)'
              }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '0.3rem' }}>
                  {levelObj.title[language]}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {levelObj.description[language]}
                </p>
              </div>

              {/* Units within this Level */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.2rem',
                position: 'relative',
                paddingLeft: '1rem',
                borderLeft: '2px dashed var(--border)'
              }}>
                {levelUnits.map((unit) => {
                  const globalIndex = SYLLABUS.findIndex(u => u.id === unit.id);
                  const unlocked = isUnlocked(globalIndex);
                  const completed = completedUnits.includes(unit.id);
                  
                  return (
                    <div 
                      key={unit.id}
                      onClick={() => handleUnitClick(unit, globalIndex)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.2rem',
                        cursor: unlocked ? 'pointer' : 'not-allowed',
                        width: '100%',
                        padding: '1rem',
                        transform: unlocked ? 'scale(1)' : 'scale(0.97)',
                        opacity: unlocked ? 1 : 0.65,
                        transition: 'all var(--transition-normal)'
                      }}
                      className="glass-panel path-node-card"
                    >
                      {/* Circle Index Indicator */}
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: completed 
                          ? 'linear-gradient(135deg, var(--success), #2ecc71)' 
                          : unlocked 
                            ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                            : 'var(--border)',
                        color: 'white',
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        flexShrink: 0,
                        boxShadow: unlocked ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                      }}>
                        {completed ? <CheckCircle size={24} /> : !unlocked ? <Lock size={18} /> : globalIndex + 1}
                      </div>

                      {/* Unit Content */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontWeight: 700,
                            color: unit.type === 'grammar' ? 'var(--secondary)' : 'var(--primary)',
                            background: unit.type === 'grammar' ? 'rgba(155, 89, 182, 0.1)' : 'var(--primary-glow)',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            {unit.type}
                          </span>
                          {completed && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 600 }}>
                              {language === 'en' ? 'Completed' : 'Completato'}
                            </span>
                          )}
                        </div>
                        <h3 style={{ fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                          {unit.title[language]}
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                          {unit.description[language]}
                        </p>
                      </div>

                      {unlocked && (
                        <ArrowRight size={18} style={{ color: 'var(--text-light)', marginLeft: 'auto' }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
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
              <span style={{ textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem' }}>
                {selectedUnit.type}
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
                {selectedUnit.items && selectedUnit.items.length > 0 && (
                  <div>
                    <h3 style={{ marginBottom: '1rem' }}>
                      {language === 'en' ? 'Characters & Sounds' : 'Caratteri e Suoni'}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      {selectedUnit.items.map((item) => (
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
                                {item.meaning[language]}
                              </div>
                            </div>

                            {/* Vocal Controls */}
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button 
                                onClick={() => void speakJapanese(item.japanese)}
                                disabled={isSpeaking}
                                style={{
                                  padding: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--primary-glow)',
                                  color: 'var(--primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  opacity: isSpeaking ? 0.6 : 1,
                                }}
                                title={language === 'en' ? 'Listen pronunciation' : 'Ascolta pronuncia'}
                              >
                                {isSpeaking ? <Loader2 size={16} /> : <Volume2 size={16} />}
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
                {selectedUnit.grammar && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ color: 'var(--secondary)' }}>{selectedUnit.grammar.title[language]}</h3>
                    <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>
                      {selectedUnit.grammar.explanation[language]}
                    </p>

                    <h4 style={{ marginTop: '0.5rem' }}>{language === 'en' ? 'Examples' : 'Esempi'}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      {selectedUnit.grammar.examples.map((example, i) => (
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
                              onClick={() => void speakJapanese(example.japanese)}
                              disabled={isSpeaking}
                              style={{
                                padding: '6px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(155, 89, 182, 0.1)',
                                color: 'var(--secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: isSpeaking ? 0.6 : 1,
                              }}
                              title={language === 'en' ? 'Listen' : 'Ascolta'}
                            >
                              {isSpeaking ? <Loader2 size={16} /> : <Volume2 size={16} />}
                            </button>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {example.romaji}
                          </div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                            {example.meaning[language]}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                      {selectedUnit.quizzes[currentQuizIndex].question[language]}
                    </h3>

                    {/* Question Interface */}
                    {selectedUnit.quizzes[currentQuizIndex].type === 'multiple-choice' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem' }}>
                        {selectedUnit.quizzes[currentQuizIndex].options?.map((option) => (
                          <button
                            key={option}
                            onClick={() => setSelectedOption(option)}
                            style={{
                              padding: '1rem',
                              borderRadius: '12px',
                              border: selectedOption === option 
                                ? '2px solid var(--primary)' 
                                : '1px solid var(--border)',
                              backgroundColor: selectedOption === option 
                                ? 'var(--primary-glow)' 
                                : 'var(--bg-input)',
                              textAlign: 'left',
                              fontSize: '1rem',
                              fontWeight: 600,
                              color: 'var(--text-main)',
                              transition: 'all var(--transition-fast)'
                            }}
                          >
                            {option}
                          </button>
                        ))}
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

                    {/* Submit Buttons */}
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
                        disabled={
                          selectedUnit.quizzes[currentQuizIndex].type === 'multiple-choice'
                            ? !selectedOption
                            : !spellingInput
                        }
                      >
                        {language === 'en' ? 'Submit Answer' : 'Invia Risposta'}
                      </button>
                    </div>
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
