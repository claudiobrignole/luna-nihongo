import { Fragment } from 'react';
import type { LanguageType } from '../components/Header';
import { JlptN4TooltipTrigger } from '../components/JlptN4Tooltip';

const JLPT_N4_TOKEN = 'JLPT N4';

export function withJlptN4Tooltip(text: string, language: LanguageType) {
  if (!text.includes(JLPT_N4_TOKEN)) return text;
  const parts = text.split(JLPT_N4_TOKEN);
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <JlptN4TooltipTrigger language={language} />}
      {part}
    </Fragment>
  ));
}
