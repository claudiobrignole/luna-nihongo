#!/usr/bin/env node
/**
 * Seed two sample blog posts in Firestore (requires Application Default Credentials).
 * Usage: npm run seed:blog
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, '..', 'functions', 'package.json'));
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'luna-nihongo';

function initAdmin() {
  if (getApps().length) return;
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath) {
    initializeApp({
      credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))),
      projectId: PROJECT_ID,
    });
  } else {
    initializeApp({ projectId: PROJECT_ID });
  }
}

const now = new Date().toISOString();

const posts = [
  {
    id: 'blog-seed-anime-particles',
    slug: 'anime-e-particelle-wa-ga',
    published: true,
    publishedAt: now,
    tags: ['anime', 'grammatica'],
    title: {
      it: 'Anime e particelle: は e が nei dialoghi veri',
      en: 'Anime and particles: は vs が in real dialogue',
    },
    excerpt: {
      it: 'Perché in un anime senti は e が usati in modo diverso dal libro? Luna ti mostra come leggerli nelle frasi che conosci.',
      en: 'Why do anime characters use は and が differently from textbooks? Luna shows how to read them in lines you already know.',
    },
    body: {
      it: `## Il problema

Nei dialoghi degli anime le particelle sembrano "saltare" o cambiare. In realtà **registro** e **contesto** spiegano quasi tutto.

## Esempio

- **私は学生です** — presentazione neutra (は = tema)
- **誰が来た？** → **田中が来た** — が marca chi compie l'azione

## Cosa fare

1. Scegli una scena breve che ami
2. Scrivi la frase in giapponese
3. Chiedi a **Luna-sensei** nel tutor: ti spiega registro e alternativa naturale

> Studia le particelle anche nel percorso **Studio** — unità grammaticali N5.`,
      en: `## The issue

In anime dialogue, particles seem to "jump" or change. **Register** and **context** explain most of it.

## Example

- **私は学生です** — neutral self-intro (は = topic)
- **Who came?** → **田中が来た** — が marks the doer

## What to do

1. Pick a short scene you love
2. Write the Japanese line
3. Ask **Luna-sensei** in the tutor — she explains register and natural alternatives

> Study particles in the **Study** path — N5 grammar units too.`,
    },
    coverImagePath: null,
    coverImageUrl: null,
    relatedSlugs: ['imparare-giapponese-con-manga'],
    authorUid: 'seed',
  },
  {
    id: 'blog-seed-manga-study',
    slug: 'imparare-giapponese-con-manga',
    published: true,
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
    body: {
      it: `## Perché funziona

I manga **ripetono** vocabolario visivo e dialoghi brevi. Perfetti dopo hiragana e primi kanji.

## Attenzione a

| Elemento | Consiglio |
|----------|-----------|
| Furigana | Ottimo per lettura, non per produzione |
| Slang | Confrontalo sempre con il registro del percorso |
| Onomatopee | Divertenti — chiedi a Luna cosa significano |

## Prossimo passo

Apri il **tutor** e racconta quale manga stai leggendo. Luna collega le frasi alle unità **N5/N4** del percorso guidato.`,
      en: `## Why it works

Manga **repeats** visual vocabulary and short dialogue. Great after hiragana and first kanji.

## Watch out for

| Element | Tip |
|---------|-----|
| Furigana | Great for reading, not for production |
| Slang | Always compare with your course register |
| Sound effects | Fun — ask Luna what they mean |

## Next step

Open the **tutor** and tell Luna which manga you are reading. She links lines to **N5/N4** units in the guided path.`,
    },
    coverImagePath: null,
    coverImageUrl: null,
    relatedSlugs: ['anime-e-particelle-wa-ga'],
    authorUid: 'seed',
  },
];

initAdmin();
const db = getFirestore();

for (const post of posts) {
  const { id, ...data } = post;
  await db.collection('blogPosts').doc(id).set({ ...data, updatedAt: now }, { merge: true });
  console.log('Seeded:', id, post.slug);
}

console.log('Done.');
