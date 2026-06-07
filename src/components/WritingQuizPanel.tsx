import React, { useState } from 'react';
import { Award, Check, CheckCircle, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { gradeWritingSubmission, WritingGradeError } from '../services/writingGradeService';
import type { WritingGradeResult, WritingQuizExtended } from '../types/writingGrading';
import { JapaneseKeyboardHelp } from './JapaneseKeyboardHelp';

type GradingPhase = 'idle' | 'loading' | 'done' | 'error';

interface WritingQuizPanelProps {
  quiz: WritingQuizExtended;
  language: 'it' | 'en';
  showRomaji: boolean;
  onPassed: () => void;
  onEarnXp?: (xp: number) => void;
  onCancel: () => void;
}

function resolveWritingGradeErrorHint(message: string, language: 'it' | 'en'): string {
  const lower = message.toLowerCase();
  if (lower.includes('route not found') || lower.includes('404')) {
    return language === 'en'
      ? 'The grading API is outdated. Stop the dev server (Ctrl+C) and run npm run dev again.'
      : 'L\'API di valutazione non è aggiornata. Ferma il server (Ctrl+C) e rilancia npm run dev.';
  }
  if (lower.includes('gemini_api_key') || lower.includes('api key')) {
    return language === 'en'
      ? 'Gemini API key missing. Add GEMINI_API_KEY to .env and restart npm run dev.'
      : 'Manca la chiave Gemini. Aggiungi GEMINI_API_KEY in .env e riavvia npm run dev.';
  }
  if (lower.includes('timed out') || lower.includes('timeout')) {
    return language === 'en'
      ? 'Grading took too long — please try again.'
      : 'La valutazione ha impiegato troppo tempo — riprova.';
  }
  if (message) return message;
  return language === 'en'
    ? 'Your text is still here — please try submitting again in a moment.'
    : 'Il tuo testo è ancora qui — riprova tra un momento.';
}

function countJapaneseChars(text: string): number {
  return [...text.trim()].length;
}

export const WritingQuizPanel: React.FC<WritingQuizPanelProps> = ({
  quiz,
  language,
  showRomaji,
  onPassed,
  onEarnXp,
  onCancel,
}) => {
  const [studentAnswer, setStudentAnswer] = useState('');
  const [phase, setPhase] = useState<GradingPhase>('idle');
  const [gradeResult, setGradeResult] = useState<WritingGradeResult | null>(null);
  const [revealedModel, setRevealedModel] = useState<{
    modelAnswer: string;
    modelAnswerKana?: string;
    modelAnswerRomaji?: string;
    modelAnswerTranslation?: string;
  } | null>(null);
  const [xpAwarded, setXpAwarded] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [keyboardHelpOpen, setKeyboardHelpOpen] = useState(false);

  const charCount = countJapaneseChars(studentAnswer);
  const { targetLength } = quiz;
  const lengthHint =
    targetLength &&
    (language === 'en'
      ? `Suggested length: ${targetLength.min}–${targetLength.max} characters (${charCount} now)`
      : `Lunghezza consigliata: ${targetLength.min}–${targetLength.max} caratteri (${charCount} ora)`);

  const handleSubmit = async () => {
    if (!studentAnswer.trim() || phase === 'loading') return;

    setPhase('loading');
    setGradeResult(null);
    setRevealedModel(null);
    setErrorDetail(null);

    try {
      const grade = await gradeWritingSubmission({
        language,
        studentAnswer: studentAnswer.trim(),
        task: quiz.task,
        rubric: quiz.rubric,
        modelAnswer: quiz.modelAnswer,
        expectsGrammarRefs: quiz.expectsGrammarRefs,
        expectsVocabRefs: quiz.expectsVocabRefs,
      });

      setGradeResult(grade);
      setRevealedModel({
        modelAnswer: quiz.modelAnswer,
        modelAnswerKana: quiz.modelAnswerKana,
        modelAnswerRomaji: quiz.modelAnswerRomaji,
        modelAnswerTranslation: quiz.modelAnswerTranslation?.[language],
      });
      setPhase('done');

      if (grade.passed && !xpAwarded) {
        const xp = quiz.xp ?? 0;
        if (xp > 0) {
          onEarnXp?.(xp);
        }
        setXpAwarded(true);
      }
    } catch (err) {
      console.warn('Writing grade failed', err);
      const message =
        err instanceof WritingGradeError
          ? err.message
          : err instanceof Error
            ? err.message
            : '';
      setErrorDetail(resolveWritingGradeErrorHint(message, language));
      setPhase('error');
    }
  };

  const handleRetryGrading = () => {
    setPhase('idle');
    setGradeResult(null);
    setRevealedModel(null);
    setErrorDetail(null);
  };

  const handleContinue = () => {
    if (gradeResult?.passed) {
      onPassed();
    }
  };

  const t = {
    submit: language === 'en' ? 'Submit' : 'Invia',
    cancel: language === 'en' ? 'Cancel' : 'Annulla',
    placeholder:
      language === 'en'
        ? 'Write your answer in Japanese (kana or kanji)…'
        : 'Scrivi la tua risposta in giapponese (kana o kanji)…',
    grading: language === 'en' ? 'Luna is reviewing your writing…' : 'Luna sta valutando il tuo testo…',
    errorTitle:
      language === 'en'
        ? "I couldn't grade this right now"
        : 'Non sono riuscita a valutare ora',
    errorBody:
      language === 'en'
        ? 'Your text is still here — please try submitting again in a moment.'
        : 'Il tuo testo è ancora qui — riprova tra un momento.',
    retry: language === 'en' ? 'Try again' : 'Riprova',
    edit: language === 'en' ? 'Edit answer' : 'Modifica risposta',
    continue: language === 'en' ? 'Continue' : 'Continua',
    passedTitle: language === 'en' ? 'Great work!' : 'Ottimo lavoro!',
    keepTrying: language === 'en' ? 'Keep going — you can try again!' : 'Continua così — puoi riprovare!',
    score: language === 'en' ? 'Score' : 'Punteggio',
    modelAnswer: language === 'en' ? 'Model answer' : 'Risposta modello',
    translation: language === 'en' ? 'Translation' : 'Traduzione',
    xpEarned: language === 'en' ? `+${quiz.xp ?? 0} XP` : `+${quiz.xp ?? 0} XP`,
    inputHelp: language === 'en' ? 'How do I type in Japanese?' : 'Come scrivo in giapponese?',
  };

  const renderTextareaFooter = (hint?: string | false) => (
    <div className="writing-quiz-textarea-footer">
      {hint ? <p className="writing-quiz-length-hint" aria-live="polite">{hint}</p> : <span />}
      <button
        type="button"
        className="writing-quiz-input-help-link"
        onClick={() => setKeyboardHelpOpen(true)}
      >
        {t.inputHelp}
      </button>
    </div>
  );

  return (
    <div className="writing-quiz-panel">
      <JapaneseKeyboardHelp
        language={language}
        open={keyboardHelpOpen}
        onClose={() => setKeyboardHelpOpen(false)}
      />

      <p className="writing-quiz-task">{quiz.task[language]}</p>

      {phase !== 'done' && (
        <>
          <textarea
            className="writing-quiz-textarea ja-text"
            value={studentAnswer}
            onChange={(e) => setStudentAnswer(e.target.value)}
            placeholder={t.placeholder}
            rows={5}
            disabled={phase === 'loading'}
            aria-label={quiz.prompt[language]}
          />
          {renderTextareaFooter(lengthHint || undefined)}
        </>
      )}

      {phase === 'loading' && (
        <div className="writing-quiz-loading" role="status">
          <Loader2 size={22} className="spin-icon" />
          <span>{t.grading}</span>
        </div>
      )}

      {phase === 'error' && (
        <div className="writing-quiz-error" role="alert">
          <AlertCircleIcon />
          <div>
            <strong>{t.errorTitle}</strong>
            <p>{errorDetail ?? t.errorBody}</p>
          </div>
        </div>
      )}

      {phase === 'done' && gradeResult && (
        <div className="writing-quiz-result">
          <div
            className={`writing-quiz-outcome ${gradeResult.passed ? 'passed' : 'not-passed'}`}
          >
            {gradeResult.passed ? <CheckCircle size={28} /> : <XCircle size={28} />}
            <div>
              <strong>{gradeResult.passed ? t.passedTitle : t.keepTrying}</strong>
              <p>{gradeResult.encouragement}</p>
              <span className="writing-quiz-score">
                {t.score}: {gradeResult.score}/100
              </span>
            </div>
          </div>

          {gradeResult.passed && (quiz.xp ?? 0) > 0 && (
            <div className="writing-quiz-xp-badge">
              <Award size={16} />
              {t.xpEarned}
            </div>
          )}

          <p className="writing-quiz-overall">{gradeResult.overallComment}</p>

          <ul className="writing-quiz-rubric">
            {gradeResult.perCriterion.map((item, index) => (
              <li key={index} className={item.met ? 'met' : 'unmet'}>
                <span className="writing-quiz-rubric-icon" aria-hidden>
                  {item.met ? <Check size={16} /> : <XCircle size={16} />}
                </span>
                <div>
                  <strong>{item.criterion}</strong>
                  <p>{item.comment}</p>
                </div>
              </li>
            ))}
          </ul>

          {revealedModel && (
            <div className="writing-quiz-model glass-panel">
              <h4>{t.modelAnswer}</h4>
              <p className="ja-text writing-quiz-model-main">{revealedModel.modelAnswer}</p>
              {revealedModel.modelAnswerKana &&
                revealedModel.modelAnswerKana !== revealedModel.modelAnswer && (
                  <p className="ja-text writing-quiz-model-kana">{revealedModel.modelAnswerKana}</p>
                )}
              {showRomaji && revealedModel.modelAnswerRomaji && (
                <p className="writing-quiz-model-romaji">{revealedModel.modelAnswerRomaji}</p>
              )}
              {revealedModel.modelAnswerTranslation && (
                <p className="writing-quiz-model-translation">
                  <span>{t.translation}: </span>
                  {revealedModel.modelAnswerTranslation}
                </p>
              )}
            </div>
          )}

          {!gradeResult.passed && (
            <>
              <textarea
                className="writing-quiz-textarea ja-text"
                value={studentAnswer}
                onChange={(e) => {
                  setStudentAnswer(e.target.value);
                  setPhase('idle');
                  setGradeResult(null);
                  setRevealedModel(null);
                  setXpAwarded(false);
                }}
                rows={4}
                aria-label={quiz.prompt[language]}
              />
              {renderTextareaFooter()}
            </>
          )}
        </div>
      )}

      <div className="writing-quiz-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          {t.cancel}
        </button>

        {phase === 'done' && gradeResult?.passed ? (
          <button type="button" className="btn btn-primary" onClick={handleContinue}>
            {t.continue}
          </button>
        ) : phase === 'error' ? (
          <button type="button" className="btn btn-primary" onClick={handleRetryGrading}>
            <RefreshCw size={18} />
            {t.retry}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleSubmit()}
            disabled={!studentAnswer.trim() || phase === 'loading'}
          >
            {phase === 'loading' ? <Loader2 size={18} className="spin-icon" /> : null}
            {t.submit}
          </button>
        )}
      </div>
    </div>
  );
};

function AlertCircleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
