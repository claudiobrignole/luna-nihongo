import React, { useState, useEffect, useCallback } from 'react';
import { loadSRSCards, saveSRSCardProgress } from '../services/srsService';
import { scheduleCard } from '../utils/srs';
import type { SRSCard } from '../utils/srs';
import { RotateCw, RefreshCw, Layers, Smile, BookOpen, AlertCircle, Loader2, Volume2 } from 'lucide-react';
import { useJapaneseSpeech } from '../hooks/useJapaneseSpeech';

interface FlashcardsProps {
  language: 'en' | 'it';
  userId: string;
}

export const Flashcards: React.FC<FlashcardsProps> = ({ language, userId }) => {
  const [cards, setCards] = useState<SRSCard[]>([]);
  const [activeDeck, setActiveDeck] = useState<'all' | 'hiragana' | 'katakana' | 'kanji'>('all');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isCramming, setIsCramming] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { speakJapanese, isSpeaking } = useJapaneseSpeech({ language });

  const fetchCards = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const loaded = await loadSRSCards(userId);
      setCards(loaded);
    } catch {
      setLoadError(
        language === 'en'
          ? 'Could not load flashcards. Check your connection.'
          : 'Impossibile caricare le flashcard. Controlla la connessione.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId, language]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const refreshDeck = async () => {
    await fetchCards();
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter cards based on tab and whether they are due
  const filteredCards = cards.filter(card => {
    const matchesTab = activeDeck === 'all' || card.type === activeDeck;
    if (isCramming) return matchesTab; // In cram mode, return all cards in this tab
    return matchesTab && card.dueDate <= todayStr; // Otherwise, only due cards
  });

  const activeCard = filteredCards[currentCardIndex];

  const handleRate = async (quality: number) => {
    if (!activeCard) return;

    const scheduling = scheduleCard(
      quality,
      activeCard.repetitions,
      activeCard.interval,
      activeCard.easiness
    );

    try {
      await saveSRSCardProgress(
        userId,
        activeCard.id,
        scheduling.repetitions,
        scheduling.interval,
        scheduling.easiness,
        scheduling.dueDate
      );
    } catch {
      setLoadError(
        language === 'en'
          ? 'Could not save progress.'
          : 'Impossibile salvare il progresso.'
      );
      return;
    }

    setIsFlipped(false);
    
    // Animate transition to next card
    setTimeout(() => {
      // Refresh local list
      const updatedCards = cards.map(c => {
        if (c.id === activeCard.id) {
          return {
            ...c,
            repetitions: scheduling.repetitions,
            interval: scheduling.interval,
            easiness: scheduling.easiness,
            dueDate: scheduling.dueDate
          };
        }
        return c;
      });
      setCards(updatedCards);

      // If we're not at the end of the filtered list, move index.
      // Else, reset index (which will show completion if list is empty).
      if (currentCardIndex + 1 < filteredCards.length) {
        // Stay on current index if we filtered the rated card out, 
        // since the list has shrunk and the next card slid into our current index!
        // Wait, if it shrinks, currentCardIndex points to the next item automatically.
        // Let's check if the list shrinks because it is no longer due.
        // If isCramming is false, the card we just rated will be filtered out.
        // Therefore, filteredCards will change. If we increment currentCardIndex, we might skip a card!
        // To be safe: if the card is filtered out, we do NOT increment index, unless we were at the very end of the list.
        if (isCramming) {
          setCurrentCardIndex(prev => prev + 1);
        } else {
          // The current card will be removed from filteredCards on re-render.
          // So the next card will automatically occupy the same index.
          // We only need to adjust if we were at the last card.
          if (currentCardIndex >= filteredCards.length - 1) {
            setCurrentCardIndex(0);
          }
        }
      } else {
        setCurrentCardIndex(0);
      }
    }, 300);
  };

  return (
    <div className="flashcards-view" style={{ maxWidth: '600px', margin: '0 auto' }}>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p>{language === 'en' ? 'Loading deck...' : 'Caricamento deck...'}</p>
        </div>
      )}

      {loadError && (
        <div style={{
          marginBottom: '1rem', padding: '0.8rem 1rem', borderRadius: '10px',
          backgroundColor: 'var(--error-glow)', color: 'var(--error)', fontSize: '0.85rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          <AlertCircle size={16} />
          {loadError}
        </div>
      )}

      {!isLoading && (
      <>
      
      {/* Deck Selector Tabs */}
      <div className="deck-selector" style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '0.5rem',
        marginBottom: '2rem',
        backgroundColor: 'var(--bg-panel)',
        padding: '0.4rem',
        borderRadius: '16px',
        border: '1px solid var(--border)'
      }}>
        {(['all', 'hiragana', 'katakana', 'kanji'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveDeck(tab);
              setCurrentCardIndex(0);
              setIsFlipped(false);
            }}
            style={{
              flex: 1,
              padding: '0.6rem 1rem',
              borderRadius: '12px',
              fontSize: '0.9rem',
              fontWeight: 600,
              textTransform: 'capitalize',
              color: activeDeck === tab ? 'var(--primary)' : 'var(--text-muted)',
              backgroundColor: activeDeck === tab ? 'var(--primary-glow)' : 'transparent',
              boxShadow: activeDeck === tab ? 'inset 0 0 0 1px var(--border-glow)' : 'none',
              transition: 'all var(--transition-fast)'
            }}
          >
            {tab === 'all' && (language === 'en' ? 'All' : 'Tutti')}
            {tab === 'hiragana' && 'Hiragana'}
            {tab === 'katakana' && 'Katakana'}
            {tab === 'kanji' && 'Kanji'}
          </button>
        ))}
      </div>

      {/* Due Info Alert */}
      {!isCramming && filteredCards.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.8rem',
          padding: '1rem',
          borderRadius: '14px',
          backgroundColor: 'var(--primary-glow)',
          border: '1px solid var(--border-glow)',
          color: 'var(--primary)',
          fontSize: '0.9rem',
          fontWeight: 600,
          marginBottom: '2rem'
        }}>
          <Layers size={18} />
          <div>
            {language === 'en'
              ? `You have ${filteredCards.length} cards due in this deck today.`
              : `Hai ${filteredCards.length} carte da ripassare in questo deck oggi.`}
          </div>
        </div>
      )}

      {/* Main Flashcard Display */}
      {filteredCards.length > 0 && activeCard ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Progress Indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span>{language === 'en' ? 'Progress' : 'Progresso'}: {currentCardIndex + 1} / {filteredCards.length}</span>
            <span>{isCramming ? (language === 'en' ? 'Cram Mode' : 'Modalità Cramming') : (language === 'en' ? 'Spaced Repetition' : 'Ripetizione Spaziata')}</span>
          </div>

          {/* 3D Flip Card Container */}
          <div 
            onClick={() => setIsFlipped(!isFlipped)}
            style={{
              perspective: '1000px',
              cursor: 'pointer',
              height: '350px',
              width: '100%',
              position: 'relative'
            }}
          >
            <div style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}>
              
              {/* CARD FRONT */}
              <div 
                className="glass-panel"
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  backfaceVisibility: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                  borderRadius: '24px',
                  backgroundColor: 'var(--bg-panel)'
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: '1.5rem',
                  left: '1.5rem',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  color: 'var(--text-light)',
                  border: '1px solid var(--border)',
                  padding: '3px 8px',
                  borderRadius: '6px'
                }}>
                  {activeCard.type}
                </span>

                <span style={{
                  position: 'absolute',
                  top: '1.5rem',
                  right: '1.5rem',
                }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void speakJapanese(activeCard.front);
                    }}
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
                    title={language === 'en' ? 'Listen' : 'Ascolta'}
                  >
                    {isSpeaking ? <Loader2 size={16} /> : <Volume2 size={16} />}
                  </button>
                </span>

                <div className="ja-text" style={{
                  fontSize: '6rem',
                  fontWeight: '700',
                  color: 'var(--text-main)',
                  lineHeight: '1',
                  marginBottom: '1rem'
                }}>
                  {activeCard.front}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: 'var(--text-light)',
                  fontSize: '0.9rem',
                  fontWeight: 500
                }}>
                  <RotateCw size={14} />
                  {language === 'en' ? 'Tap to reveal' : 'Tocca per rivelare'}
                </div>
              </div>

              {/* CARD BACK */}
              <div 
                className="glass-panel"
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                  borderRadius: '24px',
                  backgroundColor: 'var(--bg-panel)',
                  textAlign: 'center'
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: '1.5rem',
                  left: '1.5rem',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  color: 'var(--text-light)',
                  border: '1px solid var(--border)',
                  padding: '3px 8px',
                  borderRadius: '6px'
                }}>
                  {activeCard.type}
                </span>

                <div className="ja-text" style={{
                  fontSize: '3.5rem',
                  fontWeight: '700',
                  color: 'var(--primary)',
                  marginBottom: '0.5rem'
                }}>
                  {activeCard.front}
                </div>

                <div style={{
                  fontSize: '1.8rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  marginBottom: '0.5rem'
                }}>
                  /{activeCard.romaji}/
                </div>

                <div style={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: '1rem'
                }}>
                  {activeCard.meaning}
                </div>

                {activeCard.mnemonic && (
                  <div style={{
                    fontSize: '0.85rem',
                    color: 'var(--accent)',
                    backgroundColor: 'var(--accent-light)',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    maxWidth: '85%',
                    fontStyle: 'italic'
                  }}>
                    💡 {activeCard.mnemonic}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Rating Buttons (Shown when flipped) */}
          <div style={{
            opacity: isFlipped ? 1 : 0,
            pointerEvents: isFlipped ? 'auto' : 'none',
            transform: isFlipped ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.8rem'
          }}>
            <div style={{
              textAlign: 'center',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-light)'
            }}>
              {language === 'en' ? 'How well did you know this?' : 'Quanto bene lo sapevi?'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem' }}>
              
              {/* AGAIN */}
              <button 
                onClick={() => handleRate(1)}
                className="btn"
                style={{
                  backgroundColor: 'var(--error-glow)',
                  border: '1px solid hsla(5, 80%, 50%, 0.3)',
                  color: 'var(--error)',
                  flexDirection: 'column',
                  padding: '0.6rem',
                  borderRadius: '12px',
                  fontSize: '0.8rem'
                }}
              >
                <RefreshCw size={16} style={{ marginBottom: '4px' }} />
                <span>{language === 'en' ? 'Again' : 'Ricomincia'}</span>
              </button>

              {/* HARD */}
              <button 
                onClick={() => handleRate(3)}
                className="btn"
                style={{
                  backgroundColor: 'var(--accent-light)',
                  border: '1px solid hsla(var(--accent-hue), 90%, 55%, 0.3)',
                  color: 'var(--accent)',
                  flexDirection: 'column',
                  padding: '0.6rem',
                  borderRadius: '12px',
                  fontSize: '0.8rem'
                }}
              >
                <AlertCircle size={16} style={{ marginBottom: '4px' }} />
                <span>{language === 'en' ? 'Hard' : 'Difficile'}</span>
              </button>

              {/* GOOD */}
              <button 
                onClick={() => handleRate(4)}
                className="btn"
                style={{
                  backgroundColor: 'var(--success-glow)',
                  border: '1px solid hsla(150, 75%, 40%, 0.3)',
                  color: 'var(--success)',
                  flexDirection: 'column',
                  padding: '0.6rem',
                  borderRadius: '12px',
                  fontSize: '0.8rem'
                }}
              >
                <Smile size={16} style={{ marginBottom: '4px' }} />
                <span>{language === 'en' ? 'Good' : 'Buono'}</span>
              </button>

              {/* EASY */}
              <button 
                onClick={() => handleRate(5)}
                className="btn"
                style={{
                  backgroundColor: 'rgba(52, 152, 219, 0.1)',
                  border: '1px solid rgba(52, 152, 219, 0.3)',
                  color: '#3498db',
                  flexDirection: 'column',
                  padding: '0.6rem',
                  borderRadius: '12px',
                  fontSize: '0.8rem'
                }}
              >
                <BookOpen size={16} style={{ marginBottom: '4px' }} />
                <span>{language === 'en' ? 'Easy' : 'Facile'}</span>
              </button>

            </div>
          </div>

        </div>
      ) : (
        /* Finished Screen */
        <div 
          className="glass-panel"
          style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            borderRadius: '24px'
          }}
        >
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'var(--success-glow)',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Smile size={48} />
          </div>

          <h2>{language === 'en' ? 'All caught up!' : 'Tutto completato!'}</h2>
          
          <p style={{ color: 'var(--text-muted)', maxWidth: '80%', margin: '0 auto' }}>
            {language === 'en'
              ? 'You have reviewed all due cards in this deck for today. Excellent work!'
              : 'Hai ripassato tutte le carte in scadenza in questo deck per oggi. Ottimo lavoro!'}
          </p>

          <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1rem' }}>
            <button 
              onClick={refreshDeck}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              <RefreshCw size={18} />
              {language === 'en' ? 'Refresh Deck' : 'Ricarica Deck'}
            </button>

            {!isCramming ? (
              <button 
                onClick={() => {
                  setIsCramming(true);
                  setCurrentCardIndex(0);
                }}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                <Layers size={18} />
                {language === 'en' ? 'Cram All Cards' : 'Studia Tutto'}
              </button>
            ) : (
              <button 
                onClick={() => {
                  setIsCramming(false);
                  refreshDeck();
                }}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                <RefreshCw size={18} />
                {language === 'en' ? 'Normal Mode' : 'Modo Normale'}
              </button>
            )}
          </div>
        </div>
      )}

      </>
      )}

    </div>
  );
};
