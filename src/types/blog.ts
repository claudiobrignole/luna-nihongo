export type BlogTag =
  | 'grammatica'
  | 'conversazione'
  | 'giappone'
  | 'anime'
  | 'manga'
  | 'aggiornamenti';

export const BLOG_TAGS: BlogTag[] = [
  'grammatica',
  'conversazione',
  'giappone',
  'anime',
  'manga',
  'aggiornamenti',
];

export function blogTagLabel(tag: BlogTag, language: 'it' | 'en'): string {
  const labels: Record<BlogTag, { it: string; en: string }> = {
    grammatica: { it: 'Grammatica', en: 'Grammar' },
    conversazione: { it: 'Conversazione', en: 'Conversation' },
    giappone: { it: 'Giappone', en: 'Japan' },
    anime: { it: 'Anime', en: 'Anime' },
    manga: { it: 'Manga', en: 'Manga' },
    aggiornamenti: { it: 'Aggiornamenti', en: 'Updates' },
  };
  return labels[tag][language];
}

export interface BlogPost {
  id: string;
  slug: string;
  published: boolean;
  publishedAt: string;
  tags: BlogTag[];
  title: { it: string; en: string };
  excerpt: { it: string; en: string };
  body: { it: string; en: string };
  coverImagePath?: string | null;
  coverImageUrl?: string | null;
  relatedSlugs?: string[];
  updatedAt: string;
  authorUid: string;
}

export type BlogPostInput = Omit<BlogPost, 'id' | 'updatedAt'> & { id?: string };

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `post-${Date.now()}`;
}
