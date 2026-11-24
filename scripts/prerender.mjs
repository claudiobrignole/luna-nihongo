#!/usr/bin/env node
/**
 * Prerendering statico delle route pubbliche, eseguito DOPO `vite build`.
 *
 * Per ogni route pubblica (home, blog, articoli, insegnante, legal) in IT e EN,
 * genera dist/<path>/index.html clonando il dist/index.html prodotto da Vite e
 * iniettando staticamente nel <head>: title, meta description, canonical,
 * hreflang (it/en/x-default), Open Graph, Twitter Card, html lang e JSON-LD.
 *
 * LIMITAZIONE NOTA (vedi resoconto finale): qui NON viene eseguito un vero
 * rendering headless-browser (niente Puppeteer/Playwright disponibili in
 * questo ambiente sandbox). Il body generato da React (bundle JS) resta
 * quello originale di Vite: l'idratazione lato client continua a renderizzare
 * il contenuto visivo normalmente. Solo il <head> (meta/canonical/hreflang/
 * JSON-LD) e, dove applicabile, un H1 statico minimale vengono iniettati nel
 * file HTML già in fase di build, cosi' da essere presenti anche per un
 * crawler che non esegue JavaScript.
 *
 * Dati del blog: prova una lettura pubblica di Firestore via REST (chiavi
 * client pubbliche gia' in .env). Se fallisce (rete assente in questo
 * ambiente, regole di sicurezza che negano la lettura non autenticata - bug
 * noto e separato in corso di fix - o progetto non raggiungibile), ripiega
 * su un elenco statico minimo con gli slug noti (vedi FALLBACK_POSTS sotto),
 * segnalandolo chiaramente nei log di build.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDotEnv } from './load-env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const SITE_ORIGIN = 'https://lunanihongo.com';

loadDotEnv();

// --- Fallback statico: gli unici post con slug noti con certezza in questo
// ambiente (vedi scripts/seed-blog-posts.mjs). Usato SOLO se la lettura
// Firestore pubblica fallisce. Se il sito ha altri articoli pubblicati, questo
// fallback va aggiornato manualmente oppure va risolto l'accesso a Firestore
// in fase di build (vedi resoconto finale).
const FALLBACK_POSTS = [
  {
    slug: 'anime-e-particelle-wa-ga',
    publishedAt: new Date().toISOString(),
    tags: ['anime', 'grammatica'],
    title: {
      it: 'Anime e particelle: は e が nei dialoghi veri',
      en: 'Anime and particles: は vs が in real dialogue',
    },
    excerpt: {
      it: 'Perché in un anime senti は e が usati in modo diverso dal libro? Luna ti mostra come leggerli nelle frasi che conosci.',
      en: 'Why do anime characters use は and が differently from textbooks? Luna shows how to read them in lines you already know.',
    },
    coverImageUrl: null,
  },
  {
    slug: 'imparare-giapponese-con-manga',
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
    tags: ['manga', 'conversazione', 'giappone'],
    title: {
      it: 'Imparare giapponese con i manga (senza farsi ingannare)',
      en: 'Learning Japanese with manga (without fooling yourself)',
    },
    excerpt: {
      it: 'I manga sono motivazione pura — ma furigana, slang e onomatopee richiedono un metodo. Ecco come usarli con Luna Nihongo.',
      en: 'Manga is pure motivation — but furigana, slang and sound effects need a method. Here is how to use them with Luna Nihongo.',
    },
    coverImageUrl: null,
  },
];

const TAG_COVER_FALLBACK = `${SITE_ORIGIN}/og/home-1200x630.png`;

/** Prova una lettura pubblica di Firestore (REST) per i post pubblicati. */
async function fetchPublishedPostsFromFirestore() {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID?.trim();
  const apiKey = process.env.VITE_FIREBASE_API_KEY?.trim();
  if (!projectId || !apiKey) {
    console.warn('[prerender] VITE_FIREBASE_PROJECT_ID/VITE_FIREBASE_API_KEY assenti: uso fallback statico per il blog.');
    return null;
  }
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'blogPosts' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'published' },
          op: 'EQUAL',
          value: { booleanValue: true },
        },
      },
    },
  };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(`[prerender] Lettura Firestore pubblica fallita (HTTP ${res.status}): uso fallback statico per il blog.`);
      return null;
    }
    const rows = await res.json();
    const posts = [];
    for (const row of rows) {
      const fields = row?.document?.fields;
      if (!fields) continue;
      const str = (f) => f?.stringValue ?? '';
      const mapStr = (f, key) => str(f?.mapValue?.fields?.[key]);
      const arr = (f) => (f?.arrayValue?.values ?? []).map((v) => v.stringValue).filter(Boolean);
      posts.push({
        slug: str(fields.slug),
        publishedAt: str(fields.publishedAt),
        tags: arr(fields.tags),
        title: { it: mapStr(fields.title, 'it'), en: mapStr(fields.title, 'en') },
        excerpt: { it: mapStr(fields.excerpt, 'it'), en: mapStr(fields.excerpt, 'en') },
        coverImageUrl: fields.coverImageUrl?.stringValue || null,
      });
    }
    if (posts.length === 0) {
      console.warn('[prerender] Firestore raggiunto ma nessun post pubblicato trovato: uso fallback statico per il blog.');
      return null;
    }
    console.log(`[prerender] ${posts.length} post letti da Firestore per il prerender del blog.`);
    return posts;
  } catch (err) {
    console.warn(`[prerender] Lettura Firestore pubblica non riuscita (${err?.message ?? err}): uso fallback statico per il blog.`);
    return null;
  }
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return escapeHtml(s);
}

/** Costruisce il blocco <head> da iniettare (sostituisce i meta dinamici, aggiunge hreflang/JSON-LD). */
function buildHeadInjection({ title, description, canonical, pathIt, pathEn, lang, ogImage, ogType, jsonLd }) {
  const locale = lang === 'en' ? 'en_US' : 'it_IT';
  const lines = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeAttr(description)}" />`,
    `<link rel="canonical" href="${escapeAttr(canonical)}" />`,
    `<link rel="alternate" hreflang="it" href="${escapeAttr(`${SITE_ORIGIN}${pathIt}`)}" />`,
    `<link rel="alternate" hreflang="en" href="${escapeAttr(`${SITE_ORIGIN}${pathEn}`)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${escapeAttr(`${SITE_ORIGIN}${pathIt}`)}" />`,
    `<meta property="og:title" content="${escapeAttr(title)}" />`,
    `<meta property="og:description" content="${escapeAttr(description)}" />`,
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:url" content="${escapeAttr(canonical)}" />`,
    `<meta property="og:image" content="${escapeAttr(ogImage)}" />`,
    `<meta property="og:site_name" content="Luna Nihongo" />`,
    `<meta property="og:locale" content="${locale}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(description)}" />`,
    `<meta name="twitter:image" content="${escapeAttr(ogImage)}" />`,
  ];
  if (jsonLd && jsonLd.length > 0) {
    for (const schema of jsonLd) {
      lines.push(`<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
    }
  }
  return lines.join('\n    ');
}

/** Schema Person per Luna, riusato su piu' pagine (teacher + home). */
function lunaPersonSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Luna Naito',
    jobTitle: 'Japanese teacher',
    description:
      'Luna Naito, madrelingua giapponese, alumni della Waseda University (Tokyo) e della University of Oregon.',
    alumniOf: [
      { '@type': 'CollegeOrUniversity', name: 'Waseda University' },
      { '@type': 'CollegeOrUniversity', name: 'University of Oregon' },
    ],
  };
}

function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Luna Nihongo',
    url: SITE_ORIGIN,
    inLanguage: ['it', 'en'],
  };
}

function orgSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'Luna Nihongo',
    url: SITE_ORIGIN,
    sameAs: [],
  };
}

function courseSchema(lang) {
  const en = lang === 'en';
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: en ? 'From zero to JLPT N4' : 'Da zero al JLPT N4',
    description: en
      ? 'Guided path from hiragana to JLPT N4: structured units, SRS flashcards, AI tutor and live lessons with Luna.'
      : 'Percorso guidato dall’hiragana al JLPT N4: unità strutturate, flashcard SRS, tutor AI e lezioni live con Luna.',
    provider: { '@type': 'EducationalOrganization', name: 'Luna Nihongo', sameAs: SITE_ORIGIN },
  };
}

function offerSchema(lang) {
  const en = lang === 'en';
  return {
    '@context': 'https://schema.org',
    '@type': 'Offer',
    name: en ? '1-on-1 Japanese lessons with Luna' : 'Lezioni 1-to-1 di giapponese con Luna',
    category: en ? 'Private lesson' : 'Lezione privata',
    availability: 'https://schema.org/InStock',
    url: `${SITE_ORIGIN}${en ? '/en/teacher/' : '/insegnante/'}`,
  };
}

function blogPostingSchema(post, lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title[lang],
    description: post.excerpt[lang],
    datePublished: post.publishedAt || undefined,
    inLanguage: lang,
    image: post.coverImageUrl || TAG_COVER_FALLBACK,
    author: { '@type': 'Person', name: 'Luna Naito' },
    publisher: { '@type': 'EducationalOrganization', name: 'Luna Nihongo' },
    mainEntityOfPage: `${SITE_ORIGIN}${lang === 'en' ? '/en' : ''}/blog/${post.slug}`,
  };
}

// Template dist/index.html letto UNA SOLA VOLTA e tenuto in memoria: alcune
// route (la home IT) scrivono proprio su dist/index.html, quindi rileggerlo
// da disco ad ogni chiamata farebbe iniettare l'head piu' volte in cascata.
let cachedTemplate = null;
function readTemplate() {
  if (cachedTemplate !== null) return cachedTemplate;
  const templatePath = join(distDir, 'index.html');
  if (!existsSync(templatePath)) {
    throw new Error(`Template dist/index.html non trovato - esegui prima "vite build".`);
  }
  cachedTemplate = readFileSync(templatePath, 'utf8');
  return cachedTemplate;
}

/** Scrive dist/<path>/index.html a partire dal template dist/index.html. */
function writeStaticPage(pagePath, headInjection, lang, extraBodyHtml) {
  let html = readTemplate();

  // html lang coerente con la pagina.
  html = html.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`);

  // Rimuove i meta/title/link dinamici di fallback gia' presenti in
  // index.html e inietta il blocco statico per questa route subito prima
  // di </head>.
  html = html.replace(/<title>[\s\S]*?<\/title>\s*/, '');
  html = html.replace(/<meta name="description"[^>]*>\s*/, '');
  html = html.replace(/<link rel="canonical"[^>]*>\s*/, '');
  html = html.replace(/<link rel="alternate" hreflang="[^"]*"[^>]*>\s*/g, '');
  html = html.replace(/<meta property="og:title"[^>]*>\s*/, '');
  html = html.replace(/<meta property="og:description"[^>]*>\s*/, '');
  html = html.replace(/<meta property="og:type"[^>]*>\s*/, '');
  html = html.replace(/<meta property="og:url"[^>]*>\s*/, '');
  html = html.replace(/<meta property="og:image"[^>]*>\s*/, '');
  html = html.replace(/<meta property="og:site_name"[^>]*>\s*/, '');
  html = html.replace(/<meta property="og:locale"[^>]*>\s*/, '');
  html = html.replace(/<meta name="twitter:card"[^>]*>\s*/, '');
  html = html.replace(/<!-- Open Graph tags for premium sharing appearance -->\s*/, '');

  html = html.replace('</head>', `    ${headInjection}\n  </head>`);

  if (extraBodyHtml) {
    // H1/testo statico minimale dentro #root, sostituito dall'idratazione
    // React al primo render client-side (nessun flash visibile: React
    // sostituisce l'intero contenuto di #root al mount).
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root">${extraBodyHtml}</div>`,
    );
  }

  const outDir = join(distDir, pagePath.replace(/^\//, ''));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html, 'utf8');
  return join(outDir, 'index.html');
}

export async function prerender() {
  if (!existsSync(join(distDir, 'index.html'))) {
    console.warn('[prerender] dist/index.html non trovato: salto il prerendering (nessun build Vite disponibile).');
    return;
  }

  const posts = (await fetchPublishedPostsFromFirestore()) ?? FALLBACK_POSTS;
  const usedFallback = posts === FALLBACK_POSTS;

  const HOME_TITLE = {
    it: 'Luna Nihongo – Impara il giapponese (JLPT N5–N4) con ripasso spaziato e lezioni private',
    en: 'Luna Nihongo – Learn Japanese (JLPT N5–N4) with Spaced Repetition and Private Lessons',
  };
  const HOME_DESCRIPTION = {
    it: 'Impara il giapponese (hiragana, katakana, kanji e grammatica) in modo semplice ed efficace grazie al metodo a ripetizione spaziata (SRS) e prenota lezioni private personalizzate 1-on-1 con Luna.',
    en: 'Learn Japanese (hiragana, katakana, kanji and grammar) with a guided path, SRS flashcards and 1-on-1 private lessons with Luna, a native Japanese teacher.',
  };
  const HOME_H1 = {
    it: 'Impara il giapponese con Luna: da zero al JLPT N4',
    en: 'Learn Japanese with Luna: from zero to JLPT N4',
  };
  const TEACHER_TITLE = {
    it: 'Lezioni di giapponese 1-to-1 con Luna – madrelingua, JLPT N5–N1 | Luna Nihongo',
    en: '1-to-1 Japanese Lessons with Luna – Native Speaker, JLPT N5–N1 | Luna Nihongo',
  };
  const TEACHER_DESCRIPTION = {
    it: 'Prenota lezioni private 1-to-1 di giapponese con Luna, madrelingua: percorso JLPT N5-N1, grammatica, conversazione e pronuncia.',
    en: 'Book 1-to-1 private Japanese lessons with Luna, a native speaker: JLPT N5-N1 path, grammar, conversation and pronunciation.',
  };
  const BLOG_TITLE = { it: 'Blog — Luna Nihongo', en: 'Blog — Luna Nihongo' };
  const BLOG_DESCRIPTION = {
    it: 'Consigli di giapponese, grammatica, cultura, anime e manga — articoli da Luna Nihongo.',
    en: 'Japanese tips, grammar, culture, anime and manga — articles from Luna Nihongo.',
  };
  const LEGAL_TITLE = {
    privacy: { it: 'Privacy — Luna Nihongo', en: 'Privacy — Luna Nihongo' },
    cookies: { it: 'Cookie — Luna Nihongo', en: 'Cookies — Luna Nihongo' },
    terms: { it: 'Termini e condizioni — Luna Nihongo', en: 'Terms & conditions — Luna Nihongo' },
  };

  const written = [];
  const sitemapEntries = [];

  for (const lang of ['it', 'en']) {
    const other = lang === 'it' ? 'en' : 'it';
    const pathFor = (p) => (lang === 'en' ? `/en${p === '/' ? '/' : p}` : p);

    // --- Home ---
    {
      const pagePath = lang === 'en' ? '/en/' : '/';
      const pathIt = '/';
      const pathEn = '/en/';
      const canonical = `${SITE_ORIGIN}${pagePath}`;
      const head = buildHeadInjection({
        title: HOME_TITLE[lang],
        description: HOME_DESCRIPTION[lang],
        canonical,
        pathIt,
        pathEn,
        lang,
        ogImage: `${SITE_ORIGIN}/og/home-1200x630.png`,
        ogType: 'website',
        jsonLd: [websiteSchema(), orgSchema(), courseSchema(lang), offerSchema(lang), lunaPersonSchema()],
      });
      const h1 = `<h1>${escapeHtml(HOME_H1[lang])}</h1>`;
      const out = writeStaticPage(pagePath, head, lang, h1);
      written.push(out);
      sitemapEntries.push({ loc: canonical, lastmod: null });
    }

    // --- Blog list ---
    {
      const pagePath = lang === 'en' ? '/en/blog/' : '/blog/';
      const canonical = `${SITE_ORIGIN}${pagePath}`;
      const head = buildHeadInjection({
        title: BLOG_TITLE[lang],
        description: BLOG_DESCRIPTION[lang],
        canonical,
        pathIt: '/blog/',
        pathEn: '/en/blog/',
        lang,
        ogImage: `${SITE_ORIGIN}/og/home-1200x630.png`,
        ogType: 'website',
        jsonLd: [websiteSchema()],
      });
      const h1 = `<h1>${escapeHtml(lang === 'en' ? 'Blog' : 'Blog')}</h1>`;
      const out = writeStaticPage(pagePath, head, lang, h1);
      written.push(out);
      sitemapEntries.push({ loc: canonical, lastmod: null });
    }

    // --- Blog posts ---
    for (const post of posts) {
      if (!post.slug) continue;
      const pagePath = lang === 'en' ? `/en/blog/${post.slug}/` : `/blog/${post.slug}/`;
      const canonical = `${SITE_ORIGIN}${pagePath}`;
      const title = `${post.title[lang] || post.title.it} · Luna Nihongo`;
      const description = post.excerpt[lang] || post.excerpt.it;
      const head = buildHeadInjection({
        title,
        description,
        canonical,
        pathIt: `/blog/${post.slug}/`,
        pathEn: `/en/blog/${post.slug}/`,
        lang,
        ogImage: post.coverImageUrl || TAG_COVER_FALLBACK,
        ogType: 'article',
        jsonLd: [blogPostingSchema(post, lang)],
      });
      const h1 = `<h1>${escapeHtml(post.title[lang] || post.title.it)}</h1>`;
      const out = writeStaticPage(pagePath, head, lang, h1);
      written.push(out);
      sitemapEntries.push({ loc: canonical, lastmod: post.publishedAt || null });
    }

    // --- Teacher / insegnante ---
    {
      const pagePath = lang === 'en' ? '/en/teacher/' : '/insegnante/';
      const canonical = `${SITE_ORIGIN}${pagePath}`;
      const head = buildHeadInjection({
        title: TEACHER_TITLE[lang],
        description: TEACHER_DESCRIPTION[lang],
        canonical,
        pathIt: '/insegnante/',
        pathEn: '/en/teacher/',
        lang,
        ogImage: `${SITE_ORIGIN}/og/home-1200x630.png`,
        ogType: 'website',
        jsonLd: [lunaPersonSchema(), offerSchema(lang)],
      });
      const out = writeStaticPage(pagePath, head, lang, null);
      written.push(out);
      sitemapEntries.push({ loc: canonical, lastmod: null });
    }

    // --- Legal pages ---
    for (const doc of ['privacy', 'cookies', 'terms']) {
      const pagePath = lang === 'en' ? `/en/${doc}/` : `/${doc}/`;
      const canonical = `${SITE_ORIGIN}${pagePath}`;
      const head = buildHeadInjection({
        title: LEGAL_TITLE[doc][lang],
        description: LEGAL_TITLE[doc][lang],
        canonical,
        pathIt: `/${doc}/`,
        pathEn: `/en/${doc}/`,
        lang,
        ogImage: `${SITE_ORIGIN}/og/home-1200x630.png`,
        ogType: 'website',
        jsonLd: [],
      });
      const out = writeStaticPage(pagePath, head, lang, null);
      written.push(out);
      sitemapEntries.push({ loc: canonical, lastmod: null });
    }
  }

  // --- sitemap.xml ---
  const urlEntries = sitemapEntries
    .map(({ loc, lastmod }) => {
      const lastmodTag = lastmod ? `\n    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : '';
      return `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmodTag}\n  </url>`;
    })
    .join('\n');
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>\n`;
  writeFileSync(join(distDir, 'sitemap.xml'), sitemap, 'utf8');

  console.log(`[prerender] Generate ${written.length} pagine statiche + dist/sitemap.xml (${sitemapEntries.length} URL).`);
  if (usedFallback) {
    console.warn(
      '[prerender] ATTENZIONE: blog prerenderizzato con il fallback statico (2 post noti), non con i dati live di Firestore. Verifica scripts/prerender.mjs se il blog ha altri articoli pubblicati.',
    );
  }
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  prerender().catch((err) => {
    console.error('[prerender] Errore:', err);
    process.exitCode = 1;
  });
}
