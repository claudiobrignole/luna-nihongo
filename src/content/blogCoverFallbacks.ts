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
