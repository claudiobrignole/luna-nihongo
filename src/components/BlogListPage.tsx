import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { LanguageType } from './Header';
import { filterPostsByTag, listPublishedPosts } from '../services/blogService';
import { BLOG_TAGS, blogTagLabel, type BlogTag } from '../types/blog';
import { BlogPostCard } from './BlogPostCard';
import { usePageMeta, blogListUrl } from '../hooks/usePageMeta';

interface BlogListPageProps {
  language: LanguageType;
  onOpenPost: (slug: string) => void;
}

export function BlogListPage({ language, onOpenPost }: BlogListPageProps) {
  const lang = language;
  const [posts, setPosts] = useState<Awaited<ReturnType<typeof listPublishedPosts>>>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState<BlogTag | null>(null);

  usePageMeta({
    title: lang === 'en' ? 'Blog — Luna Nihongo' : 'Blog — Luna Nihongo',
    description:
      lang === 'en'
        ? 'Japanese tips, grammar, culture, anime and manga — articles from Luna Nihongo.'
        : 'Consigli di giapponese, grammatica, cultura, anime e manga — articoli da Luna Nihongo.',
    url: blogListUrl(),
    type: 'website',
  });

  useEffect(() => {
    void listPublishedPosts()
      .then(setPosts)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => filterPostsByTag(posts, activeTag), [posts, activeTag]);

  return (
    <div className="blog-page page-view">
      <div className="blog-tag-filters" role="tablist" aria-label={lang === 'en' ? 'Filter by tag' : 'Filtra per tag'}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTag === null}
          className={`blog-tag-filter${activeTag === null ? ' active' : ''}`}
          onClick={() => setActiveTag(null)}
        >
          {lang === 'en' ? 'All' : 'Tutti'}
        </button>
        {BLOG_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            role="tab"
            aria-selected={activeTag === tag}
            className={`blog-tag-filter${activeTag === tag ? ' active' : ''}`}
            onClick={() => setActiveTag(tag)}
          >
            {blogTagLabel(tag, lang)}
          </button>
        ))}
      </div>

      {loading && (
        <p className="blog-loading">
          <Loader2 size={20} className="spin" />
          {lang === 'en' ? 'Loading posts…' : 'Caricamento articoli…'}
        </p>
      )}

      {!loading && filtered.length === 0 && (
        <p className="blog-empty">
          {lang === 'en' ? 'No posts yet. Check back soon!' : 'Nessun articolo ancora. Torna presto!'}
        </p>
      )}

      <div className="blog-list-grid">
        {filtered.map((post) => (
          <BlogPostCard key={post.id} post={post} language={language} onOpen={onOpenPost} />
        ))}
      </div>
    </div>
  );
}
