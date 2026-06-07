import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Award,
  CheckCircle,
  ChevronLeft,
  Eraser,
  Loader2,
  Pencil,
  Play,
  XCircle,
} from 'lucide-react';
import type { HydratedUnit, StrokeOrderQuiz, StrokeData } from '../types/curriculum';
import {
  canUseStrokeCanvas,
  loadKanjiVgCharacter,
  type KanjiVgCharacter,
  type Point2D,
} from '../services/kanjiVgLoader';
import { evaluateStrokeOrder, type StrokeCheckResult } from '../utils/strokeMatch';
import { KanjiVgCreditLink } from './CreditsModal';

interface StrokeOrderQuizPanelProps {
  quiz: StrokeOrderQuiz;
  unit: HydratedUnit;
  language: 'it' | 'en';
  onPassed: () => void;
  onEarnXp?: (xp: number) => void;
  onCancel: () => void;
  onPrevious?: () => void;
  onOpenCredits: () => void;
}

type PanelMode = 'draw' | 'fallback' | 'loading' | 'error';

function findStrokeData(unit: HydratedUnit, targetItemId: string): StrokeData | null {
  const fromKana = unit.kana?.find((k) => k.id === targetItemId)?.strokeData;
  if (fromKana) return fromKana;
  const fromKanji = unit.kanji?.find((k) => k.id === targetItemId)?.strokeData;
  return fromKanji ?? null;
}

function strokeIssueMessage(
  issue: StrokeCheckResult['issue'],
  strokeNum: number,
  language: 'it' | 'en',
): string {
  const n = strokeNum;
  if (language === 'en') {
    switch (issue) {
      case 'too_short':
        return `Stroke ${n} looks too short — try drawing it a bit longer.`;
      case 'start':
        return `Stroke ${n}: start closer to the gray guide.`;
      case 'end':
        return `Stroke ${n}: finish closer to where the guide ends.`;
      case 'direction':
        return `Stroke ${n}: follow the same direction as the guide.`;
      case 'shape':
        return `Stroke ${n}: follow the curve of the guide more closely.`;
      default:
        return `Stroke ${n} needs another try — you're getting there!`;
    }
  }
  switch (issue) {
    case 'too_short':
      return `Il tratto ${n} è un po' corto — prova a disegnarlo un po' più lungo.`;
    case 'start':
      return `Tratto ${n}: inizia più vicino alla guida grigia.`;
    case 'end':
      return `Tratto ${n}: termina più vicino alla fine della guida.`;
    case 'direction':
      return `Tratto ${n}: segui la stessa direzione della guida.`;
    case 'shape':
      return `Tratto ${n}: segui un po' di più la curva della guida.`;
    default:
      return `Tratto ${n}: riprova — ci stai arrivando!`;
  }
}

export const StrokeOrderQuizPanel: React.FC<StrokeOrderQuizPanelProps> = ({
  quiz,
  unit,
  language,
  onPassed,
  onEarnXp,
  onCancel,
  onPrevious,
  onOpenCredits,
}) => {
  const strokeMeta = findStrokeData(unit, quiz.targetItemId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const activeStrokeRef = useRef<Point2D[]>([]);
  const userStrokesRef = useRef<Point2D[][]>([]);
  const capturedPointerIdRef = useRef<number | null>(null);
  const gradeGenerationRef = useRef(0);
  const [mode, setMode] = useState<PanelMode>('loading');
  const [character, setCharacter] = useState<KanjiVgCharacter | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentStroke, setCurrentStroke] = useState<Point2D[]>([]);
  const [gradeResult, setGradeResult] = useState<ReturnType<typeof evaluateStrokeOrder> | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [passed, setPassed] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(false);
  const [animIndex, setAnimIndex] = useState(0);
  const [animPlaying, setAnimPlaying] = useState(false);

  const canvasSupported = canUseStrokeCanvas();
  const enforceOrder = quiz.enforceOrder !== false;

  useEffect(() => {
    if (!strokeMeta) {
      setLoadError(language === 'en' ? 'Stroke data missing.' : 'Dati tratto mancanti.');
      setMode('error');
      return;
    }

    let cancelled = false;
    setMode('loading');
    void loadKanjiVgCharacter(strokeMeta.kanjiVgId)
      .then((data) => {
        if (cancelled) return;
        setCharacter(data);
        setMode(canvasSupported ? 'draw' : 'fallback');
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(
          language === 'en'
            ? 'Could not load stroke guide.'
            : 'Impossibile caricare la guida dei tratti.',
        );
        setMode('error');
      });

    return () => {
      cancelled = true;
    };
  }, [strokeMeta, language, canvasSupported]);

  const releasePointerCapture = useCallback(() => {
    const canvas = canvasRef.current;
    const pointerId = capturedPointerIdRef.current;
    if (!canvas || pointerId === null) return;
    try {
      canvas.releasePointerCapture(pointerId);
    } catch {
      // Pointer already released.
    }
    capturedPointerIdRef.current = null;
  }, []);

  const canvasPoint = useCallback((clientX: number, clientY: number): Point2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  }, []);

  const canvasColor = useCallback((cssVar: string, fallback: string) => {
    if (typeof window === 'undefined') return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
    return value || fallback;
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const drawStroke = (points: Point2D[], color: string, width: number) => {
      if (points.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(points[0].x * w, points[0].y * h);
      for (let i = 1; i < points.length; i += 1) {
        ctx.lineTo(points[i].x * w, points[i].y * h);
      }
      ctx.stroke();
    };

    for (const stroke of userStrokesRef.current) {
      drawStroke(stroke, canvasColor('--primary', '#e74c3c'), 5);
    }
    if (currentStroke.length > 1) {
      drawStroke(currentStroke, canvasColor('--secondary', '#9b59b6'), 5);
    }
  }, [currentStroke, canvasColor]);

  useLayoutEffect(() => {
    if (mode === 'draw') redrawCanvas();
  }, [mode, redrawCanvas]);

  const awardXp = useCallback(() => {
    if (xpAwarded) return;
    const xp = quiz.xp ?? 0;
    if (xp > 0) onEarnXp?.(xp);
    setXpAwarded(true);
  }, [xpAwarded, quiz.xp, onEarnXp]);

  const handleGrade = useCallback(
    (strokes: Point2D[][]) => {
      if (!character) return;
      const result = evaluateStrokeOrder(strokes, character.strokes, enforceOrder);
      setGradeResult(result);

      if (result.passed) {
        setPassed(true);
        setFeedback(
          language === 'en'
            ? 'Beautiful work! Your stroke order looks great.'
            : 'Ottimo lavoro! L\'ordine dei tratti è corretto.',
        );
        awardXp();
        return;
      }

      if (result.tooMany) {
        setFeedback(
          language === 'en'
            ? `You drew too many strokes — ${character.strokes.length} are expected. Tap clear and try again!`
            : `Hai disegnato troppi tratti — ne servono ${character.strokes.length}. Cancella e riprova!`,
        );
        return;
      }
      if (result.tooFew) {
        setFeedback(
          language === 'en'
            ? `Keep going — ${character.strokes.length} strokes in total. You've drawn ${strokes.length} so far.`
            : `Continua — servono ${character.strokes.length} tratti in totale. Ne hai disegnati ${strokes.length}.`,
        );
        return;
      }

      const firstBad = result.strokeResults.findIndex((r) => !r.ok);
      if (firstBad >= 0) {
        const issue = result.strokeResults[firstBad].issue;
        setFeedback(strokeIssueMessage(issue, firstBad + 1, language));
        if (enforceOrder && firstBad > 0 && result.strokeResults.slice(0, firstBad).every((r) => r.ok)) {
          setFeedback(
            (language === 'en'
              ? `Strokes 1–${firstBad} look good! `
              : `I tratti 1–${firstBad} vanno bene! `) + strokeIssueMessage(issue, firstBad + 1, language),
          );
        }
      } else {
        setFeedback(
          language === 'en'
            ? 'Almost there — adjust your strokes and try again.'
            : 'Quasi — sistema i tratti e riprova.',
        );
      }
    },
    [character, enforceOrder, language, awardXp],
  );

  const finishStroke = useCallback(
    (stroke: Point2D[]) => {
      if (stroke.length < 2) return;
      const generation = gradeGenerationRef.current;
      const next = [...userStrokesRef.current, stroke];
      userStrokesRef.current = next;
      setCurrentStroke([]);
      activeStrokeRef.current = [];
      queueMicrotask(() => {
        if (gradeGenerationRef.current !== generation) return;
        handleGrade(next);
      });
    },
    [handleGrade],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (passed || mode !== 'draw') return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    capturedPointerIdRef.current = e.pointerId;
    drawingRef.current = true;
    setGradeResult(null);
    setFeedback(null);
    const pt = canvasPoint(e.clientX, e.clientY);
    if (pt) {
      activeStrokeRef.current = [pt];
      setCurrentStroke([pt]);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || passed) return;
    const pt = canvasPoint(e.clientX, e.clientY);
    if (!pt) return;
    const prev = activeStrokeRef.current;
    const last = prev[prev.length - 1];
    if (last && dist(last, pt) < 0.008) return;
    activeStrokeRef.current = [...prev, pt];
    setCurrentStroke(activeStrokeRef.current);
  };

  const endPointerStroke = () => {
    releasePointerCapture();
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const stroke = activeStrokeRef.current;
    if (stroke.length >= 2) {
      finishStroke(stroke);
    } else {
      activeStrokeRef.current = [];
      setCurrentStroke([]);
    }
  };

  const onPointerUp = () => {
    endPointerStroke();
  };

  const onPointerCancel = () => {
    releasePointerCapture();
    drawingRef.current = false;
    activeStrokeRef.current = [];
    setCurrentStroke([]);
  };

  const clearStrokes = () => {
    gradeGenerationRef.current += 1;
    releasePointerCapture();
    drawingRef.current = false;
    activeStrokeRef.current = [];
    userStrokesRef.current = [];
    setCurrentStroke([]);
    setGradeResult(null);
    setFeedback(null);
    setPassed(false);
    setXpAwarded(false);

    requestAnimationFrame(() => redrawCanvas());
  };

  const switchToFallback = () => {
    releasePointerCapture();
    drawingRef.current = false;
    setMode('fallback');
    setAnimIndex(0);
    setAnimPlaying(true);
  };

  const switchToDraw = () => {
    setMode('draw');
    setAnimPlaying(false);
    setAnimIndex(0);
  };

  useEffect(() => {
    if (mode !== 'fallback' || !animPlaying || !character) return;
    const timer = window.setInterval(() => {
      setAnimIndex((i) => {
        if (i + 1 >= character.strokes.length) {
          setAnimPlaying(false);
          return 0;
        }
        return i + 1;
      });
    }, 900);
    return () => window.clearInterval(timer);
  }, [mode, animPlaying, character]);

  const confirmFallback = () => {
    setPassed(true);
    setFeedback(
      language === 'en'
        ? 'Great — watching the order carefully still helps your hand learn the rhythm.'
        : 'Perfetto — osservare l\'ordine aiuta comunque la mano a imparare il ritmo.',
    );
    awardXp();
  };

  const t = {
    clear: language === 'en' ? 'Clear' : 'Cancella',
    continue: language === 'en' ? 'Continue' : 'Continua',
    previous: language === 'en' ? 'Previous' : 'Indietro',
    backToDraw: language === 'en' ? 'Back to tracing' : 'Torna al tracciamento',
    fallbackLink:
      language === 'en'
        ? "Can't trace? Watch stroke order instead"
        : 'Non puoi tracciare? Guarda l\'ordine dei tratti',
    fallbackTitle:
      language === 'en' ? 'Stroke order animation' : 'Animazione ordine tratti',
    fallbackHint:
      language === 'en'
        ? 'Watch each stroke appear in order, then confirm when ready.'
        : 'Guarda ogni tratto comparire in ordine, poi conferma quando sei pronto/a.',
    fallbackConfirm:
      language === 'en' ? 'I understand the order' : 'Ho capito l\'ordine',
    replay: language === 'en' ? 'Replay' : 'Rivedi',
    strokes: language === 'en' ? 'strokes' : 'tratti',
    loading: language === 'en' ? 'Loading character guide…' : 'Carico la guida del carattere…',
  };

  if (mode === 'loading') {
    return (
      <div className="stroke-quiz-panel">
        <div className="stroke-quiz-loading">
          <Loader2 size={22} className="spin-icon" />
          {t.loading}
        </div>
      </div>
    );
  }

  if (mode === 'error' || !character) {
    return (
      <div className="stroke-quiz-panel">
        <p className="stroke-quiz-error">{loadError}</p>
        <button type="button" className="btn btn-secondary" onClick={switchToFallback}>
          {t.fallbackLink}
        </button>
      </div>
    );
  }

  return (
    <div className="stroke-quiz-panel">
      <div className="stroke-quiz-char-label ja-text">{quiz.japanese}</div>

      {mode === 'draw' ? (
        <>
          <div className="stroke-quiz-canvas-wrap">
            <img
              src={character.svgUrl}
              alt=""
              className="stroke-quiz-ghost"
              draggable={false}
            />
            <canvas
              ref={canvasRef}
              className="stroke-quiz-canvas"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              onPointerCancel={onPointerCancel}
            />
          </div>
          <p className="stroke-quiz-hint">
            {language === 'en'
              ? `${character.strokes.length} strokes · follow the gray guide · feedback after each stroke`
              : `${character.strokes.length} tratti · segui la guida grigia · feedback dopo ogni tratto`}
          </p>
          <div className="stroke-quiz-toolbar">
            <button type="button" className="btn btn-secondary" onClick={clearStrokes}>
              <Eraser size={16} />
              {t.clear}
            </button>
            <button type="button" className="stroke-quiz-fallback-link" onClick={switchToFallback}>
              {t.fallbackLink}
            </button>
          </div>
        </>
      ) : (
        <div className="stroke-quiz-fallback">
          <p className="stroke-quiz-hint">{t.fallbackHint}</p>
          <div className="stroke-quiz-canvas-wrap stroke-quiz-fallback-stage">
            <img src={character.svgUrl} alt="" className="stroke-quiz-ghost" draggable={false} />
            <svg
              className="stroke-quiz-fallback-overlay"
              viewBox={character.viewBox}
              aria-hidden
            >
              {character.strokes.slice(0, animIndex + 1).map((stroke) => (
                <polyline
                  key={stroke.number}
                  points={stroke.samples
                    .map((p) => `${p.x * character.width},${p.y * character.height}`)
                    .join(' ')}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </svg>
          </div>
          <p className="stroke-quiz-anim-label">
            {language === 'en' ? 'Stroke' : 'Tratto'} {Math.min(animIndex + 1, character.strokes.length)} /{' '}
            {character.strokes.length}
          </p>
          <div className="stroke-quiz-toolbar">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setAnimIndex(0);
                setAnimPlaying(true);
              }}
            >
              <Play size={16} />
              {t.replay}
            </button>
            <button type="button" className="btn btn-primary" onClick={confirmFallback} disabled={passed}>
              {t.fallbackConfirm}
            </button>
            <button type="button" className="stroke-quiz-fallback-link" onClick={switchToDraw}>
              <Pencil size={14} aria-hidden />
              {t.backToDraw}
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <div className={`stroke-quiz-feedback ${passed ? 'passed' : 'retry'}`}>
          {passed ? <CheckCircle size={20} /> : <XCircle size={20} />}
          <p>{feedback}</p>
          {passed && (quiz.xp ?? 0) > 0 && (
            <span className="stroke-quiz-xp">
              <Award size={14} /> +{quiz.xp} XP
            </span>
          )}
        </div>
      )}

      {gradeResult && !passed && gradeResult.strokeResults.length > 0 && (
        <ul className="stroke-quiz-stroke-list">
          {gradeResult.strokeResults.map((r, i) => (
            <li key={i} className={r.ok ? 'ok' : 'bad'}>
              {language === 'en' ? 'Stroke' : 'Tratto'} {i + 1}:{' '}
              {r.ok
                ? (language === 'en' ? 'Good!' : 'Bene!')
                : (language === 'en' ? 'Try again' : 'Riprova')}
            </li>
          ))}
        </ul>
      )}

      <KanjiVgCreditLink language={language} onOpenCredits={onOpenCredits} />

      <div className="stroke-quiz-actions">
        {onPrevious ? (
          <button type="button" className="btn btn-secondary" onClick={onPrevious}>
            <ChevronLeft size={18} />
            {t.previous}
          </button>
        ) : null}
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          {language === 'en' ? 'Cancel' : 'Annulla'}
        </button>
        {passed ? (
          <button type="button" className="btn btn-primary" onClick={onPassed}>
            {t.continue}
          </button>
        ) : null}
      </div>
    </div>
  );
};

function dist(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
