#!/usr/bin/env node
/**
 * Prerendering statico delle route pubbliche, eseguito DOPO `vite build`.
 *
 * Per ogni route pubblica (home, blog, articoli, insegnante, legal) in IT e EN,
 * genera dist/<path>/index.html clonando il dist/index.html prodotto da Vite e
 * iniettando staticamente nel <head>: title, meta description, canonical,
 * hreflang (it/en/x-default), Open Graph, Twitter Card, html lang e JSON-LD.
 *
 * NOTA: non c'e' un rendering con browser headless. Oltre al <head>, lo script
 * inserisce dentro <div id="root"> un corpo HTML statico con H1, testo reale e
 * link interni (<a href>) per ogni pagina: cosi' un crawler che non esegue
 * JavaScript vede contenuto e struttura. React (createRoot) sostituisce questo
 * corpo al primo render nel browser. I testi legali e del profilo di Luna sono
 * letti dagli stessi file TypeScript usati dall'app (src/content/*), cosi' non
 * si disallineano; il corpo degli articoli e' convertito con le stesse
 * librerie Markdown dell'app (react-markdown + remark-gfm + rehype-sanitize).
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

/** Carica un file TypeScript senza import (src/content/*) transpilandolo al volo. */
async function loadTsModule(relPath) {
  const ts = (await import('typescript')).default;
  const source = readFileSync(join(root, relPath), 'utf8');
  const out = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(out, 'utf8').toString('base64')}`);
}

/** Converte il Markdown di un articolo in HTML con le stesse librerie dell'app. */
async function renderMarkdownToHtml(md) {
  if (!md) return '';
  try {
    const React = (await import('react')).default;
    const { renderToStaticMarkup } = await import('react-dom/server');
    const ReactMarkdown = (await import('react-markdown')).default;
    const remarkGfm = (await import('remark-gfm')).default;
    const rehypeSanitize = (await import('rehype-sanitize')).default;
    return renderToStaticMarkup(
      React.createElement(ReactMarkdown, { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSanitize] }, md),
    );
  } catch (err) {
    console.warn(`[prerender] Conversione Markdown non riuscita (${err?.message ?? err}): uso testo semplice.`);
    return md
      .split(/\n{2,}/)
      .map((para) => `<p>${escapeHtml(para)}</p>`)
      .join('\n');
  }
}

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
        body: {
          it: mapStr(fields.body, 'it') || str(fields.bodyIt),
          en: mapStr(fields.body, 'en') || str(fields.bodyEn),
        },
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


// --- Corpo HTML statico (testo reale + link interni) -------------------------

const BASE = (lang) => (lang === 'en' ? '/en' : '');
const hrefs = (lang) => ({
  home: lang === 'en' ? '/en/' : '/',
  blog: `${BASE(lang)}/blog/`,
  teacher: lang === 'en' ? '/en/teacher/' : '/insegnante/',
  privacy: `${BASE(lang)}/privacy/`,
  cookies: `${BASE(lang)}/cookies/`,
  terms: `${BASE(lang)}/terms/`,
  post: (slug) => `${BASE(lang)}/blog/${slug}/`,
  other: (pathIt, pathEn) => (lang === 'en' ? pathIt : pathEn),
});

function navHtml(lang, switchTo) {
  const h = hrefs(lang);
  const en = lang === 'en';
  return (
    `<nav aria-label="${en ? 'Main' : 'Principale'}">` +
    `<a href="${h.home}">Luna Nihongo</a> ` +
    `<a href="${h.teacher}">${en ? 'Teacher' : 'Insegnante'}</a> ` +
    `<a href="${h.blog}">Blog</a> ` +
    (switchTo ? `<a href="${switchTo.href}" hreflang="${switchTo.lang}">${switchTo.label}</a>` : '') +
    `</nav>`
  );
}

function footerHtml(lang) {
  const h = hrefs(lang);
  const en = lang === 'en';
  return (
    `<footer><a href="${h.privacy}">Privacy</a> ` +
    `<a href="${h.cookies}">${en ? 'Cookies' : 'Cookie'}</a> ` +
    `<a href="${h.terms}">${en ? 'Terms and conditions' : 'Termini e condizioni'}</a></footer>`
  );
}

function wrapPage(lang, switchTo, inner) {
  return `<div class="prerender-static"><header>${navHtml(lang, switchTo)}</header><main>${inner}</main>${footerHtml(lang)}</div>`;
}

function postListHtml(lang, posts) {
  const h = hrefs(lang);
  const items = posts
    .filter((p) => p.slug)
    .map((p) => {
      const t = p.title[lang] || p.title.it;
      const ex = p.excerpt[lang] || p.excerpt.it;
      return `<li><a href="${h.post(p.slug)}">${escapeHtml(t)}</a>${ex ? `<p>${escapeHtml(ex)}</p>` : ''}</li>`;
    })
    .join('');
  return items ? `<ul>${items}</ul>` : '';
}

const HOME_LEAD = {
  it: "Luna Nihongo è il percorso guidato dall'hiragana al JLPT N4: unità strutturate, flashcard SRS, un tutor AI che parla con te e lezioni live con Luna, in italiano e inglese.",
  en: 'Luna Nihongo is the guided path from hiragana to JLPT N4: structured units, SRS flashcards, an AI tutor that speaks with you, and live lessons with Luna, in Italian and English.',
};
const BLOG_INTRO = {
  it: 'Consigli di giapponese, cultura, anime e aggiornamenti da Luna.',
  en: 'Japanese tips, culture, anime and updates from Luna.',
};

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
  const legalMod = await loadTsModule('src/content/legalDocs.ts');
  const profileMod = await loadTsModule('src/content/lunaProfileText.ts');
  const LEGAL_DOCS = legalMod.LEGAL_DOCS;
  const LAST_UPDATED = legalMod.LAST_UPDATED;
  const PROFILE = profileMod.LUNA_PROFILE_TEXT;

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
      const h = hrefs(lang);
      const en = lang === 'en';
      const inner =
        `<h1>${escapeHtml(HOME_H1[lang])}</h1><p>${escapeHtml(HOME_LEAD[lang])}</p>` +
        `<p><a href="${h.teacher}">${en ? 'Lessons with Luna' : 'Lezioni con Luna'}</a> · <a href="${h.blog}">Blog</a></p>` +
        `<h2>${en ? 'From the blog' : 'Dal blog'}</h2>${postListHtml(lang, posts)}`;
      const body = wrapPage(lang, { href: lang === 'en' ? '/' : '/en/', lang: lang === 'en' ? 'it' : 'en', label: lang === 'en' ? 'Italiano' : 'English' }, inner);
      const out = writeStaticPage(pagePath, head, lang, body);
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
      const inner = `<h1>Blog</h1><p>${escapeHtml(BLOG_INTRO[lang])}</p>${postListHtml(lang, posts)}`;
      const body = wrapPage(lang, { href: lang === 'en' ? '/blog/' : '/en/blog/', lang: lang === 'en' ? 'it' : 'en', label: lang === 'en' ? 'Italiano' : 'English' }, inner);
      const out = writeStaticPage(pagePath, head, lang, body);
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
      const h = hrefs(lang);
      const mdSource = post.body?.[lang] || post.body?.it || '';
      const bodyHtml = mdSource
        ? await renderMarkdownToHtml(mdSource)
        : `<p>${escapeHtml(post.excerpt[lang] || post.excerpt.it)}</p>`;
      const inner =
        `<article><h1>${escapeHtml(post.title[lang] || post.title.it)}</h1>` +
        `<div class="blog-prose">${bodyHtml}</div></article>` +
        `<p><a href="${h.blog}">${lang === 'en' ? '← All articles' : '← Tutti gli articoli'}</a></p>`;
      const body = wrapPage(lang, { href: lang === 'en' ? `/blog/${post.slug}/` : `/en/blog/${post.slug}/`, lang: lang === 'en' ? 'it' : 'en', label: lang === 'en' ? 'Italiano' : 'English' }, inner);
      const out = writeStaticPage(pagePath, head, lang, body);
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
      const h = hrefs(lang);
      const bullets = PROFILE.bullets[lang].map((b) => `<li>${escapeHtml(b)}</li>`).join('');
      const inner =
        `<h1>${escapeHtml(PROFILE.title[lang])}</h1>` +
        `<h2>${escapeHtml(PROFILE.fullName)}</h2><p>${escapeHtml(PROFILE.badge[lang])}</p>` +
        `<p>${escapeHtml(PROFILE.lead[lang])}</p><ul>${bullets}</ul>` +
        `<p><a href="${h.home}">${lang === 'en' ? 'Explore the Luna Nihongo course' : 'Scopri il percorso Luna Nihongo'}</a> · <a href="${h.blog}">Blog</a></p>`;
      const body = wrapPage(lang, { href: lang === 'en' ? '/insegnante/' : '/en/teacher/', lang: lang === 'en' ? 'it' : 'en', label: lang === 'en' ? 'Italiano' : 'English' }, inner);
      const out = writeStaticPage(pagePath, head, lang, body);
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
      const d = LEGAL_DOCS[doc];
      const sections = d.sections
        .map((sec) => `<section><h2>${escapeHtml(sec.h[lang])}</h2>${sec.p.map((para) => `<p>${escapeHtml(para[lang])}</p>`).join('')}</section>`)
        .join('');
      const inner =
        `<h1>${escapeHtml(d.title[lang])}</h1>` +
        `<p>${lang === 'en' ? 'Last updated' : 'Ultimo aggiornamento'}: ${escapeHtml(LAST_UPDATED)}</p>` +
        `<p>${escapeHtml(d.intro[lang])}</p>${sections}`;
      const body = wrapPage(lang, { href: lang === 'en' ? `/${doc}/` : `/en/${doc}/`, lang: lang === 'en' ? 'it' : 'en', label: lang === 'en' ? 'Italiano' : 'English' }, inner);
      const out = writeStaticPage(pagePath, head, lang, body);
      written.push(out);
      sitemapEntries.push({ loc: canonical, lastmod: null });
    }
  }

  // --- 404.html: pagina di errore vera, con noindex ---
  {
    let html = readTemplate();
    html = html.replace(/<html lang="[^"]*"/, '<html lang="it"');
    html = html.replace(/<title>[\s\S]*?<\/title>\s*/, '');
    html = html.replace(/<meta name="description"[^>]*>\s*/, '');
    html = html.replace(/<link rel="canonical"[^>]*>\s*/, '');
    html = html.replace('</head>', `    <title>Pagina non trovata · Luna Nihongo</title>\n    <meta name="robots" content="noindex, nofollow" />\n  </head>`);
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root"><div class="prerender-static"><main><h1>Pagina non trovata</h1><p>La pagina che cerchi non esiste o è stata spostata.</p><p><a href="/">Vai alla home di Luna Nihongo</a></p></main></div></div>`,
    );
    writeFileSync(join(distDir, '404.html'), html, 'utf8');
    written.push(join(distDir, '404.html'));
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
