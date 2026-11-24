/**
 * Routing pubblico con path reali (IT default, /en/... per l'inglese).
 * Sostituisce il precedente hash router (#blog, #privacy, ecc.).
 *
 * Mappa: path -> { tab, slug? } e tab -> path, per IT ed EN.
 * Le aree riservate (Studio, flashcard, tutor, dashboard, admin, auth, booking)
 * restano gestite via stato React (TabType), senza un path pubblico dedicato:
 * per queste il path resta "/" e la UI naviga in-app (noindex, nofollow).
 */
import type { TabType } from '../components/Header';
import type { AppLanguage } from './language';

export type PublicTab = 'home' | 'blog' | 'teacher' | 'privacy' | 'cookies' | 'terms';

export function isPublicTab(tab: TabType): tab is PublicTab {
  return (
    tab === 'home' ||
    tab === 'blog' ||
    tab === 'teacher' ||
    tab === 'privacy' ||
    tab === 'cookies' ||
    tab === 'terms'
  );
}

/** Segmento di path (senza /en) per ogni tab pubblica. '' = radice (home). */
const TAB_PATH_SEGMENT: Record<PublicTab, string> = {
  home: '',
  blog: 'blog',
  teacher: 'insegnante',
  privacy: 'privacy',
  cookies: 'cookies',
  terms: 'terms',
};

/** Segmento EN quando diverso dall'IT (solo /en/teacher -> /en/teacher, non /en/insegnante). */
const TAB_PATH_SEGMENT_EN: Partial<Record<PublicTab, string>> = {
  teacher: 'teacher',
};

function segmentForTab(tab: PublicTab, language: AppLanguage): string {
  if (language === 'en' && TAB_PATH_SEGMENT_EN[tab] !== undefined) {
    return TAB_PATH_SEGMENT_EN[tab]!;
  }
  return TAB_PATH_SEGMENT[tab];
}

/**
 * Costruisce il path pubblico assoluto (senza origin) per una tab/lingua/slug.
 * Es: buildPath('blog', 'it', 'imparare-giapponese-con-manga') -> '/blog/imparare-giapponese-con-manga'
 *     buildPath('teacher', 'en') -> '/en/teacher'
 *     buildPath('home', 'en') -> '/en/'
 */
export function buildPath(tab: PublicTab, language: AppLanguage, slug?: string | null): string {
  const seg = segmentForTab(tab, language);
  const parts: string[] = [];
  if (language === 'en') parts.push('en');
  if (seg) parts.push(seg);
  if (tab === 'blog' && slug) parts.push(slug);
  const path = `/${parts.join('/')}`;
  // Home e liste mantengono la barra finale (coerenza con canonical); i post no.
  if (tab === 'blog' && slug) return path;
  return path.endsWith('/') ? path : `${path}/`;
}

export interface ParsedRoute {
  language: AppLanguage;
  tab: PublicTab | null;
  slug: string | null;
}

/**
 * Interpreta un path reale (pathname) in lingua + tab pubblica + eventuale slug.
 * Ritorna tab: null se il path non corrisponde a nessuna route pubblica nota
 * (l'app lo tratta come area riservata o 404, a seconda del contesto).
 */
export function parsePath(pathname: string): ParsedRoute {
  const segments = pathname.split('/').filter(Boolean);
  let language: AppLanguage = 'it';
  if (segments[0] === 'en') {
    language = 'en';
    segments.shift();
  }

  if (segments.length === 0) {
    return { language, tab: 'home', slug: null };
  }

  const [first, second] = segments;

  if (first === 'blog') {
    return { language, tab: 'blog', slug: second ?? null };
  }
  if (first === 'teacher' || first === 'insegnante') {
    return { language, tab: 'teacher', slug: null };
  }
  if (first === 'privacy') {
    return { language, tab: 'privacy', slug: null };
  }
  if (first === 'cookies') {
    return { language, tab: 'cookies', slug: null };
  }
  if (first === 'terms') {
    return { language, tab: 'terms', slug: null };
  }

  return { language, tab: null, slug: null };
}

/** Converte un vecchio hash (#blog/slug, #privacy, ecc.) nel path nuovo equivalente, se riconosciuto. */
export function legacyHashToPath(hash: string, language: AppLanguage): string | null {
  const h = hash.replace(/^#/, '');
  if (!h) return null;
  if (h === 'privacy' || h === 'cookies' || h === 'terms') {
    return buildPath(h, language);
  }
  if (h === 'blog') {
    return buildPath('blog', language);
  }
  if (h.startsWith('blog/')) {
    return buildPath('blog', language, h.slice(5));
  }
  return null;
}
