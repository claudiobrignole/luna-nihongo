import { useCallback, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LanguageType } from './Header';

const COPY = {
  it: {
    title: 'JLPT',
    kicker: '日本語能力試験',
    subtitle: 'Japanese Language Proficiency Test',
    intro: 'Esame ufficiale di giapponese, due volte l’anno. Cinque livelli dal più base al più avanzato:',
    levels: [
      { id: 'N5', name: 'Base', desc: 'Primi kanji, hiragana/katakana, frasi semplici al presente.' },
      { id: 'N4', name: 'Elementare', desc: 'Conversazioni quotidiane, grammatica essenziale, ~300 kanji.' },
      { id: 'N3', name: 'Intermedio', desc: 'Testi e dialoghi più lunghi; punto di svolta verso il giapponese “vero”.' },
      { id: 'N2', name: 'Pre-avanzato', desc: 'Giornali, lavoro, opinioni; spesso richiesto in azienda in Giappone.' },
      { id: 'N1', name: 'Avanzato', desc: 'Padronanza ampia: testi complessi, sfumature, registro formale.' },
    ],
    luna: 'Luna Nihongo copre N5 e N4 nel percorso guidato.',
    advanced:
      'N3–N1 sono fuori dal programma attuale: molti studenti li affrontano dopo un periodo in Giappone.',
  },
  en: {
    title: 'JLPT',
    kicker: '日本語能力試験',
    subtitle: 'Japanese Language Proficiency Test',
    intro: 'The official Japanese exam, held twice a year. Five levels from beginner to advanced:',
    levels: [
      { id: 'N5', name: 'Beginner', desc: 'First kanji, hiragana/katakana, simple present-tense phrases.' },
      { id: 'N4', name: 'Elementary', desc: 'Everyday conversation, essential grammar, ~300 kanji.' },
      { id: 'N3', name: 'Intermediate', desc: 'Longer texts and dialogues; the bridge to “real” Japanese.' },
      { id: 'N2', name: 'Pre-advanced', desc: 'News, work, opinions; often required by employers in Japan.' },
      { id: 'N1', name: 'Advanced', desc: 'Broad mastery: complex texts, nuance, formal register.' },
    ],
    luna: 'Luna Nihongo covers N5 and N4 in the guided path.',
    advanced:
      'N3–N1 are outside the current program: many learners tackle them after time in Japan.',
  },
} as const;

interface JlptN4TooltipTriggerProps {
  language: LanguageType;
}

export function JlptN4TooltipTrigger({ language }: JlptN4TooltipTriggerProps) {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const c = COPY[language];

  const clearHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 10,
      left: rect.left + rect.width / 2,
    });
  }, []);

  const show = () => {
    clearHideTimer();
    updatePosition();
    setOpen(true);
  };

  const scheduleHide = () => {
    clearHideTimer();
    hideTimer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="mg-jlpt-trigger"
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        onFocus={show}
        onBlur={scheduleHide}
      >
        JLPT N4
      </button>
      {open &&
        createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            className="mg-jlpt-bubble"
            style={{ top: coords.top, left: coords.left }}
            onMouseEnter={show}
            onMouseLeave={scheduleHide}
          >
            <p className="mg-jlpt-bubble-kicker" lang="ja">
              {c.kicker}
            </p>
            <p className="mg-jlpt-bubble-title">{c.title}</p>
            <p className="mg-jlpt-bubble-sub">{c.subtitle}</p>
            <p className="mg-jlpt-bubble-intro">{c.intro}</p>
            <ul className="mg-jlpt-bubble-levels">
              {c.levels.map((level) => (
                <li
                  key={level.id}
                  className={level.id === 'N5' || level.id === 'N4' ? 'is-luna' : undefined}
                >
                  <span className="mg-jlpt-bubble-level-id">{level.id}</span>
                  <span className="mg-jlpt-bubble-level-name">{level.name}</span>
                  <span className="mg-jlpt-bubble-level-desc">{level.desc}</span>
                </li>
              ))}
            </ul>
            <p className="mg-jlpt-bubble-luna">{c.luna}</p>
            <p className="mg-jlpt-bubble-foot">{c.advanced}</p>
          </div>,
          document.body,
        )}
    </>
  );
}
