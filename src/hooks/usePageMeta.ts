import { useEffect } from 'react';

const SITE_ORIGIN = 'https://lunanihongo.com';
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/favicon.svg`;

export interface PageMetaOptions {
  title?: string;
  description?: string;
  image?: string | null;
  url?: string;
  type?: 'website' | 'article';
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
      setMeta('name', 'twitter:card', 'summary_large_image');
      setCanonical(SITE_ORIGIN);
      return;
    }

    const title = options.title ?? DEFAULT_TITLE;
    const description = options.description ?? DEFAULT_DESCRIPTION;
    const image = options.image || DEFAULT_OG_IMAGE;
    const url = options.url ?? SITE_ORIGIN;
    const type = options.type ?? 'website';

    document.title = title;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:image', image);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:type', type);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', image);
    setCanonical(url);
  }, [options?.title, options?.description, options?.image, options?.url, options?.type]);
}

export function blogPostUrl(slug: string): string {
  return `${SITE_ORIGIN}/#blog/${slug}`;
}

export function blogListUrl(): string {
  return `${SITE_ORIGIN}/#blog`;
}
