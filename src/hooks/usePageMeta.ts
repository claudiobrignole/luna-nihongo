import { useEffect } from 'react';
import { buildPath } from '../utils/routes';
import type { AppLanguage } from '../utils/language';

const SITE_ORIGIN = 'https://lunanihongo.com';
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og/home-1200x630.png`;

export interface PageMetaOptions {
  title?: string;
  description?: string;
  image?: string | null;
  url?: string;
  type?: 'website' | 'article';
  /** Lingua della pagina corrente: imposta html lang e og:locale. */
  language?: AppLanguage;
  /** Path pubblico (senza origin) della versione IT, per l'hreflang alternato. */
  pathIt?: string;
  /** Path pubblico (senza origin) della versione EN, per l'hreflang alternato. */
  pathEn?: string;
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setLink(rel: string, hreflang: string | null, href: string) {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.querySelector(selector) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    if (hreflang) el.setAttribute('hreflang', hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function clearAlternates() {
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
}

function setHreflang(pathIt?: string, pathEn?: string) {
  clearAlternates();
  if (!pathIt && !pathEn) return;
  if (pathIt) setLink('alternate', 'it', `${SITE_ORIGIN}${pathIt}`);
  if (pathEn) setLink('alternate', 'en', `${SITE_ORIGIN}${pathEn}`);
  // x-default punta sempre alla versione italiana (lingua di default del sito).
  setLink('alternate', 'x-default', `${SITE_ORIGIN}${pathIt ?? '/'}`);
}

const DEFAULT_TITLE =
  'Luna Nihongo - Impara il Giapponese con il Ripasso Spaziato e Lezioni Private';
const DEFAULT_DESCRIPTION =
  'Impara il giapponese (hiragana, katakana, kanji e grammatica) in modo semplice ed efficace grazie al metodo a ripetizione spaziata (SRS) e prenota lezioni private personalizzate 1-on-1 con Luna.';

export function usePageMeta(options: PageMetaOptions | null) {
  useEffect(() => {
    if (!options) {
      document.title = DEFAULT_TITLE;
      setMeta('name', 'description', DEFAULT_DESCRIPTION);
      setMeta('property', 'og:title', 'Luna Nihongo - Impara il Giapponese con Luna');
      setMeta('property', 'og:description', DEFAULT_DESCRIPTION);
      setMeta('property', 'og:image', DEFAULT_OG_IMAGE);
      setMeta('property', 'og:type', 'website');
      setMeta('property', 'og:site_name', 'Luna Nihongo');
      setMeta('name', 'twitter:card', 'summary_large_image');
      setCanonical(SITE_ORIGIN);
      return;
    }

    const title = options.title ?? DEFAULT_TITLE;
    const description = options.description ?? DEFAULT_DESCRIPTION;
    const image = options.image || DEFAULT_OG_IMAGE;
    const url = options.url ?? SITE_ORIGIN;
    const type = options.type ?? 'website';
    const language = options.language ?? 'it';

    document.title = title;
    document.documentElement.lang = language;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:image', image);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:site_name', 'Luna Nihongo');
    setMeta('property', 'og:locale', language === 'en' ? 'en_US' : 'it_IT');
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', image);
    setCanonical(url);
    setHreflang(options.pathIt, options.pathEn);
  }, [
    options?.title,
    options?.description,
    options?.image,
    options?.url,
    options?.type,
    options?.language,
    options?.pathIt,
    options?.pathEn,
  ]);
}

export function blogPostUrl(slug: string, language: AppLanguage = 'it'): string {
  return `${SITE_ORIGIN}${buildPath('blog', language, slug)}`;
}

export function blogListUrl(language: AppLanguage = 'it'): string {
  return `${SITE_ORIGIN}${buildPath('blog', language)}`;
}

export { SITE_ORIGIN };
