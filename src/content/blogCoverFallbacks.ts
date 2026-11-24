import lunaStudy from '../assets/brand/luna-study.webp';
import lunaFlash from '../assets/brand/luna-flash.webp';
import lunaTalk from '../assets/brand/luna-talk.webp';
import lunaTorii from '../assets/brand/luna-torii.webp';
import lunaWave from '../assets/brand/luna-wave.webp';
import type { BlogPost, BlogTag } from '../types/blog';

const TAG_COVER: Record<BlogTag, string> = {
  anime: lunaTalk,
  manga: lunaFlash,
  grammatica: lunaStudy,
  conversazione: lunaTalk,
  giappone: lunaTorii,
  aggiornamenti: lunaWave,
};

const DEFAULT_COVER = lunaStudy;

export function resolveBlogCoverUrl(post: Pick<BlogPost, 'coverImageUrl' | 'tags'>): string {
  if (post.coverImageUrl) return post.coverImageUrl;
  for (const tag of post.tags) {
    const cover = TAG_COVER[tag];
    if (cover) return cover;
  }
  return DEFAULT_COVER;
}

const TAG_COVER_ALT: Record<BlogTag, { it: string; en: string }> = {
  anime: { it: 'Luna chiacchiera in stile manga, illustrazione di copertina', en: 'Luna chatting, manga-style cover illustration' },
  manga: { it: 'Luna con un mazzo di flashcard, illustrazione di copertina', en: 'Luna holding a deck of flashcards, cover illustration' },
  grammatica: { it: 'Luna che studia, illustrazione di copertina', en: 'Luna studying, cover illustration' },
  conversazione: { it: 'Luna chiacchiera in stile manga, illustrazione di copertina', en: 'Luna chatting, manga-style cover illustration' },
  giappone: { it: 'Torii giapponese, illustrazione di copertina', en: 'Japanese torii gate, cover illustration' },
  aggiornamenti: { it: 'Luna saluta tra i petali di ciliegio, illustrazione di copertina', en: 'Luna waving among cherry blossoms, cover illustration' },
};

/** Alt text descrittivo per la cover dell'articolo, basato sul primo tag noto o sul titolo come fallback. */
export function resolveBlogCoverAlt(
  post: Pick<BlogPost, 'coverImageUrl' | 'tags' | 'title'>,
  language: 'it' | 'en',
): string {
  for (const tag of post.tags) {
    const alt = TAG_COVER_ALT[tag];
    if (alt) return alt[language];
  }
  const title = post.title[language] || post.title.it;
  return language === 'en' ? `Cover illustration for “${title}”` : `Illustrazione di copertina per “${title}”`;
}
