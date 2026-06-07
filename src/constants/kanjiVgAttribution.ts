/** KanjiVG CC-BY-SA 3.0 attribution — keep in sync with public/kanjivg/ATTRIBUTION.md */

export const KANJIVG_ATTRIBUTION = {
  release: 'r20250816',
  author: 'Ulrich Apel',
  project: 'KanjiVG',
  siteUrl: 'https://kanjivg.tagaini.net/',
  repoUrl: 'https://github.com/KanjiVG/kanjivg',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  licenseShort: 'CC-BY-SA 3.0',
} as const;

export function kanjiVgAttributionLine(language: 'it' | 'en'): string {
  if (language === 'en') {
    return `Stroke order diagrams © ${KANJIVG_ATTRIBUTION.author} / ${KANJIVG_ATTRIBUTION.project}, ${KANJIVG_ATTRIBUTION.licenseShort}.`;
  }
  return `Diagrammi dell'ordine dei tratti © ${KANJIVG_ATTRIBUTION.author} / ${KANJIVG_ATTRIBUTION.project}, ${KANJIVG_ATTRIBUTION.licenseShort}.`;
}

export function kanjiVgAttributionDetail(language: 'it' | 'en'): string {
  if (language === 'en') {
    return `Stroke order diagrams © 2009–2026 ${KANJIVG_ATTRIBUTION.author} / ${KANJIVG_ATTRIBUTION.project}, licensed under ${KANJIVG_ATTRIBUTION.licenseShort}. Source: ${KANJIVG_ATTRIBUTION.repoUrl} (release ${KANJIVG_ATTRIBUTION.release}). SVG files are used unmodified.`;
  }
  return `Diagrammi dell'ordine dei tratti © 2009–2026 ${KANJIVG_ATTRIBUTION.author} / ${KANJIVG_ATTRIBUTION.project}, licenza ${KANJIVG_ATTRIBUTION.licenseShort}. Fonte: ${KANJIVG_ATTRIBUTION.repoUrl} (release ${KANJIVG_ATTRIBUTION.release}). I file SVG sono usati senza modifiche.`;
}
