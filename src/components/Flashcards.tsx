import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { loadSRSCards, saveSRSCardProgress } from '../services/srsService';
import { scheduleCard, type SRSCard, type SRSCardType } from '../utils/srs';
import { CURRICULUM_LEVELS, CURRICULUM_META, N5_MAX_LEVEL } from '../data/curriculum';
import {
  cardMatchesDeckFilter,
  countCardsInDeckFilter,
  getLevelSourceIds,
} from '../utils/curriculumDeck';
import { RotateCw, RefreshCw, Layers, Smile, BookOpen, AlertCircle, Loader2, Volume2 } from 'lucide-react';
import { useJapaneseSpeech } from '../hooks/useJapaneseSpeech';
import { HubFilterGrid, HubFilterStack } from './HubFilterGrid';
import type { SyllabusLevel } from '../types/curriculum';

interface FlashcardsProps {
  language: 'en' | 'it';
  userId: string;
}

export const Flashcards: React.FC<FlashcardsProps> = ({ language, userId }) => {
  const [cards, setCards] = useState<SRSCard[]>([]);
  const [activeLevel, setActiveLevel] = useState<number | 'all'>('all');
  const [activeType, setActiveType] = useState<SRSCardType | 'all'>('all');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isCramming, setIsCramming] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { speakJapanese, speakingItemId } = useJapaneseSpeech({ language });

  const fetchCards = useCallback(async (options?: { refresh?: boolean }): Promise<SRSCard[] | null> => {
    if (options?.refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setLoadError(null);
    try {
      const loaded = await loadSRSCards(userId, language);
      setCards(loaded);
      return loaded;
    } catch {
      setLoadError(
        language === 'en'
          ? 'Could not load flashcards. Check your connection.'
          : 'Impossibile caricare le flashcard. Controlla la connessione.'
      );
      return null;
    } finally {
      if (options?.refresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [userId, language]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const levelGroups: { key: 'n5' | 'n4'; label: string; levels: SyllabusLevel[] }[] = useMemo(
    () => [
      {
        key: 'n5',
        label: 'JLPT N5',
        levels: CURRICULUM_LEVELS.filter((lvl) => lvl.level <= N5_MAX_LEVEL),
      },
      {
        key: 'n4',
        label: 'JLPT N4',
        levels: CURRICULUM_LEVELS.filter((lvl) => lvl.level > N5_MAX_LEVEL),
      },
    ],
    [],
  );

  const levelTabLabel = (lvl: SyllabusLevel) =>
    lvl.title[language].replace(/^Livello \d+ · |^Level \d+ · /, '');

  const levelSourceIds = useMemo(
    () => (activeLevel === 'all' ? null : getLevelSourceIds(activeLevel)),
    [activeLevel],
  );

  const refreshDeck = async () => {
    const loaded = await fetchCards({ refresh: true });
    setCurrentCardIndex(0);
    setIsFlipped(false);
    if (!loaded) return;

    const inFilter = loaded.filter((card) =>
      cardMatchesDeckFilter(card, activeLevel, activeType, levelSourceIds),
    );
    const today = new Date().toISOString().split('T')[0];
    const dueInFilter = inFilter.filter((card) => card.dueDate <= today);

    if (inFilter.length > 0 && dueInFilter.length === 0) {
      setIsCramming(true);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const cardsInFilter = useMemo(() => {
    return cards.filter((card) =>
      cardMatchesDeckFilter(card, activeLevel, activeType, levelSourceIds),
    );
  }, [cards, activeLevel, activeType, levelSourceIds]);

  const filteredCards = useMemo(() => {
    if (isCramming) return cardsInFilter;
    return cardsInFilter.filter((card) => card.dueDate <= todayStr);
  }, [cardsInFilter, isCramming, todayStr]);

  const deckTotalInFilter = cardsInFilter.length;

  const deckTotalIfAllTypes = useMemo(() => {
    if (activeType === 'all') return deckTotalInFilter;
    return countCardsInDeckFilter(cards, activeLevel, 'all');
  }, [cards, activeLevel, activeType, deckTotalInFilter]);

  const dueCountInFilter = useMemo(
    () => cardsInFilter.filter((card) => card.dueDate <= todayStr).length,
    [cardsInFilter, todayStr],
  );

  // When a level/type filter has cards but none due today, start cram so the deck is usable immediately.
  useEffect(() => {
    if (isLoading || deckTotalInFilter === 0) return;
    if (dueCountInFilter === 0) {
      setIsCramming(true);
      setCurrentCardIndex(0);
      setIsFlipped(false);
    } else {
      setIsCramming(false);
    }
  }, [activeLevel, activeType, isLoading, deckTotalInFilter, dueCountInFilter]);

  const deckEmptyReason = useMemo(() => {
    if (cards.length === 0) return 'no-catalog' as const;
    if (deckTotalInFilter === 0) {
      return activeType !== 'all' && deckTotalIfAllTypes > 0 ? 'no-type-match' as const : 'no-cards' as const;
    }
    if (isCramming && filteredCards.length === 0) return 'cram-done' as const;
    return 'no-due' as const;
  }, [cards.length, deckTotalInFilter, deckTotalIfAllTypes, activeType, isCramming, filteredCards.length]);

  const typeLabels: Record<SRSCardType | 'all', { en: string; it: string }> = {
    all: { en: 'All types', it: 'Tutti i tipi' },
    hiragana: { en: 'Hiragana', it: 'Hiragana' },
    katakana: { en: 'Katakana', it: 'Katakana' },
    kanji: { en: 'Kanji', it: 'Kanji' },
    vocab: { en: 'Vocab', it: 'Vocaboli' },
    grammar: { en: 'Grammar', it: 'Grammatica' },
    dialogue: { en: 'Dialogue', it: 'Dialogo' },
  };

  useEffect(() => {
    if (filteredCards.length === 0) {
      if (currentCardIndex !== 0) setCurrentCardIndex(0);
      return;
    }
    if (currentCardIndex >= filteredCards.length) {
      setCurrentCardIndex(0);
    }
  }, [filteredCards.length, currentCardIndex]);

  const safeCardIndex =
    filteredCards.length === 0 ? 0 : Math.min(currentCardIndex, filteredCards.length - 1);
  const activeCard = filteredCards[safeCardIndex];

  const activeLevelMeta =
    activeLevel === 'all' ? null : CURRICULUM_LEVELS.find((l) => l.level === activeLevel);
  const activeLevelLabel =
    activeLevel === 'all'
      ? (language === 'en' ? 'All levels' : 'Tutti i livelli')
      : activeLevelMeta
        ? levelTabLabel(activeLevelMeta)
        : `L${activeLevel}`;

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
    <div className="flashcards-view deck-hub page-view">

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
      
      <header className="deck-hub-header">
        <div>
          <h2>{language === 'en' ? 'Decks' : 'Deck'}</h2>
          <p>
            {language === 'en'
              ? `${cards.length} cards from all ${CURRICULUM_META.unitCount} Studio units (N5 + N4). Filter by level and type — you choose what to review.`
              : `${cards.length} carte da tutte le ${CURRICULUM_META.unitCount} unità Studio (N5 + N4). Filtra per livello e tipo — scegli tu cosa ripassare.`}
          </p>
        </div>
      </header>

      <HubFilterStack>
        <div className="study-level-groups deck-level-groups">
          <div className="study-level-group">
            <span className="study-level-group-label">
              {language === 'en' ? 'Level' : 'Livello'}
            </span>
            <div className="study-level-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeLevel === 'all'}
                className={`study-level-tab ${activeLevel === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setActiveLevel('all');
                  setIsCramming(false);
                  setCurrentCardIndex(0);
                  setIsFlipped(false);
                }}
              >
                {language === 'en' ? 'All levels' : 'Tutti i livelli'}
              </button>
            </div>
          </div>
          {levelGroups.map((group) => (
            <div key={group.key} className="study-level-group">
              <span className="study-level-group-label">{group.label}</span>
              <div className="study-level-tabs" role="tablist" aria-label={group.label}>
                {group.levels.map((lvl) => (
                  <button
                    key={lvl.level}
                    type="button"
                    role="tab"
                    aria-selected={activeLevel === lvl.level}
                    className={`study-level-tab ${activeLevel === lvl.level ? 'active' : ''}`}
                    onClick={() => {
                      setActiveLevel(lvl.level);
                      setIsCramming(false);
                      setCurrentCardIndex(0);
                      setIsFlipped(false);
                    }}
                  >
                    {levelTabLabel(lvl)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <HubFilterGrid<SRSCardType | 'all'>
          label={language === 'en' ? 'Card type' : 'Tipo di carta'}
          options={(['all', 'hiragana', 'katakana', 'kanji', 'vocab', 'grammar', 'dialogue'] as const).map((tab) => ({
            value: tab,
            label: typeLabels[tab][language],
          }))}
          value={activeType}
          accent="secondary"
          compact
          onChange={(tab) => {
            setActiveType(tab);
            setIsCramming(false);
            setCurrentCardIndex(0);
            setIsFlipped(false);
          }}
        />
      </HubFilterStack>

      <p className="deck-filter-meta">
        {language === 'en'
          ? `${deckTotalInFilter} cards in filter · ${filteredCards.length} ${isCramming ? 'to study' : 'due today'}`
          : `${deckTotalInFilter} carte nel filtro · ${filteredCards.length} ${isCramming ? 'da studiare' : 'in scadenza oggi'}`}
      </p>

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
      {filteredCards.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Progress Indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span>{language === 'en' ? 'Progress' : 'Progresso'}: {safeCardIndex + 1} / {filteredCards.length}</span>
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
                      void speakJapanese(activeCard.front, activeCard.sourceId);
                    }}
                    disabled={speakingItemId !== null}
                    style={{
                      padding: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary-glow)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: speakingItemId === activeCard.sourceId ? 0.6 : 1,
                    }}
                    title={language === 'en' ? 'Listen' : 'Ascolta'}
                  >
                    {speakingItemId === activeCard.sourceId ? <Loader2 size={16} className="spin" /> : <Volume2 size={16} />}
                  </button>
                </span>

                <div
                  className="ja-text"
                  style={{
                    fontSize: activeCard.type === 'grammar' || activeCard.front.length > 8 ? '2.2rem' : '6rem',
                    fontWeight: '700',
                    color: 'var(--text-main)',
                    lineHeight: 1.25,
                    marginBottom: '1rem',
                    textAlign: 'center',
                    maxWidth: '100%',
                    wordBreak: 'break-word',
                  }}
                >
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

                {activeCard.type !== 'grammar' && (
                  <div className="ja-text" style={{
                    fontSize: activeCard.front.length > 4 ? '2.5rem' : '3.5rem',
                    fontWeight: '700',
                    color: 'var(--primary)',
                    marginBottom: '0.5rem'
                  }}>
                    {activeCard.front}
                  </div>
                )}

                {activeCard.romaji && activeCard.type !== 'kanji' && (
                  <div style={{
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    marginBottom: '0.5rem'
                  }}>
                    /{activeCard.romaji}/
                  </div>
                )}

                {activeCard.type === 'kanji' && activeCard.back && (
                  <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    {activeCard.back}
                  </div>
                )}

                {activeCard.type === 'grammar' && (
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.5rem' }}>
                    {activeCard.back}
                  </div>
                )}

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

          <h2>
            {deckEmptyReason === 'no-catalog'
              ? (language === 'en' ? 'Deck not loaded' : 'Deck non caricato')
              : deckEmptyReason === 'no-type-match'
                ? (language === 'en' ? 'No cards for this type' : 'Nessuna carta di questo tipo')
                : deckEmptyReason === 'no-cards'
                  ? (language === 'en' ? 'No cards in this filter' : 'Nessuna carta in questo filtro')
                  : deckEmptyReason === 'no-due'
                    ? (language === 'en' ? 'Nothing due today' : 'Nessuna carta in scadenza oggi')
                    : (language === 'en' ? 'All done in this filter!' : 'Filtro completato!')}
          </h2>

          <p style={{ color: 'var(--text-muted)', maxWidth: '80%', margin: '0 auto' }}>
            {deckEmptyReason === 'no-catalog'
              ? (language === 'en'
                ? 'Could not build the deck from the curriculum. Reload the page or check your connection.'
                : 'Impossibile costruire il deck dal curriculum. Ricarica la pagina o controlla la connessione.')
              : deckEmptyReason === 'no-type-match'
                ? (language === 'en'
                  ? `${typeLabels[activeType][language]} has no cards at ${activeLevelLabel}, but ${deckTotalIfAllTypes} cards exist with all types.`
                  : `«${typeLabels[activeType][language]}» non ha carte in ${activeLevelLabel}, ma con tutti i tipi ce ne sono ${deckTotalIfAllTypes}.`)
              : deckEmptyReason === 'no-cards'
                ? (language === 'en'
                  ? 'Try another level — synthesis levels (L6 / L12) include review cards from earlier lessons.'
                  : 'Prova un altro livello — i livelli di sintesi (L6 / L12) includono carte di ripasso delle lezioni precedenti.')
                : deckEmptyReason === 'no-due'
                  ? (language === 'en'
                    ? `${deckTotalInFilter} cards match this filter but none are due today. Use Study all to review anyway.`
                    : `${deckTotalInFilter} carte in questo filtro ma nessuna in scadenza oggi. Usa Studia tutto per ripassare comunque.`)
                  : (language === 'en'
                    ? 'You finished every card in this filter. Switch level or return to spaced repetition.'
                    : 'Hai finito tutte le carte di questo filtro. Cambia livello o torna al ripasso spaziato.')}
          </p>

          <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => void refreshDeck()}
              disabled={isRefreshing}
              className="btn btn-secondary"
              style={{ flex: 1, minWidth: '140px' }}
            >
              {isRefreshing ? <Loader2 size={18} className="spin" /> : <RefreshCw size={18} />}
              {language === 'en' ? 'Reload progress' : 'Ricarica progressi'}
            </button>

            {deckEmptyReason === 'no-type-match' && (
              <button
                type="button"
                onClick={() => {
                  setActiveType('all');
                  setIsCramming(false);
                  setCurrentCardIndex(0);
                  setIsFlipped(false);
                }}
                className="btn btn-primary"
                style={{ flex: 1, minWidth: '140px' }}
              >
                <Layers size={18} />
                {language === 'en' ? 'All types' : 'Tutti i tipi'}
              </button>
            )}

            {deckEmptyReason === 'no-due' && (
              <button
                type="button"
                onClick={() => {
                  setIsCramming(true);
                  setCurrentCardIndex(0);
                  setIsFlipped(false);
                }}
                className="btn btn-primary"
                style={{ flex: 1, minWidth: '140px' }}
              >
                <Layers size={18} />
                {language === 'en' ? 'Study all' : 'Studia tutto'}
              </button>
            )}

            {deckEmptyReason === 'cram-done' && (
              <button
                type="button"
                onClick={() => {
                  setIsCramming(false);
                  setCurrentCardIndex(0);
                  setIsFlipped(false);
                }}
                className="btn btn-primary"
                style={{ flex: 1, minWidth: '140px' }}
              >
                <Layers size={18} />
                {language === 'en' ? 'Due cards only' : 'Solo scadenze'}
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
