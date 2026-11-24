import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { LanguageType } from './Header';
import { getPostBySlug, listPublishedPosts, relatedPosts } from '../services/blogService';
import type { BlogPost } from '../types/blog';
import { blogTagLabel } from '../types/blog';
import { BlogMarkdown } from './BlogMarkdown';
import { BlogPostCard } from './BlogPostCard';
import { usePageMeta, blogPostUrl } from '../hooks/usePageMeta';
import { resolveBlogCoverUrl, resolveBlogCoverAlt } from '../content/blogCoverFallbacks';
import { buildPath } from '../utils/routes';
import { handleInternalNavClick } from '../utils/navLink';

interface BlogPostPageProps {
  slug: string;
  language: LanguageType;
  onBack: () => void;
  onOpenPost: (slug: string) => void;
}

export function BlogPostPage({ slug, language, onBack, onOpenPost }: BlogPostPageProps) {
  const lang = language;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [related, setRelated] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    void getPostBySlug(slug)
      .then(async (found) => {
        if (!found || !found.published) {
          setError(true);
          setPost(null);
          return;
        }
        setPost(found);
        const all = await listPublishedPosts();
        setRelated(relatedPosts(found, all));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  usePageMeta(
    post
      ? {
          title: `${post.title[lang]} \u00b7 Luna Nihongo`,
          description: post.excerpt[lang],
          image: resolveBlogCoverUrl(post),
          url: blogPostUrl(post.slug, lang),
          type: 'article',
          language: lang,
          pathIt: buildPath('blog', 'it', post.slug),
          pathEn: buildPath('blog', 'en', post.slug),
        }
      : null,
  );

  if (loading) {
    return (
      <p className="blog-loading page-view">
        <Loader2 size={20} className="spin" />
        {lang === 'en' ? 'Loading\u2026' : 'Caricamento\u2026'}
      </p>
    );
  }

  if (error || !post) {
    return (
      <div className="blog-page page-view">
        <p>{lang === 'en' ? 'Post not found.' : 'Articolo non trovato.'}</p>
        <a href={buildPath('blog', lang)} className="mg-btn" onClick={handleInternalNavClick(onBack)}>
          <ArrowLeft size={16} />
          {lang === 'en' ? 'Back to blog' : 'Torna al blog'}
        </a>
      </div>
    );
  }

  const coverUrl = resolveBlogCoverUrl(post);
  const coverAlt = resolveBlogCoverAlt(post, lang);

  return (
    <article className="blog-article page-view">
      <a href={buildPath('blog', lang)} className="blog-back-link" onClick={handleInternalNavClick(onBack)}>
        <ArrowLeft size={16} />
        {lang === 'en' ? 'All posts' : 'Tutti gli articoli'}
      </a>

      <header className="blog-article-header">
        <div className="blog-card-tags">
          {post.tags.map((tag) => (
            <span key={tag} className="blog-tag">
              {blogTagLabel(tag, lang)}
            </span>
          ))}
        </div>
        <h1>{post.title[lang]}</h1>
        <p className="blog-article-excerpt">{post.excerpt[lang]}</p>
      </header>

      <div className="blog-article-cover">
        <img src={coverUrl} alt={coverAlt} />
      </div>

      <BlogMarkdown content={post.body[lang]} />

      {related.length > 0 && (
        <section className="blog-read-also">
          <h2>{lang === 'en' ? 'Read also' : 'Leggi anche'}</h2>
          <div className="blog-teaser-grid">
            {related.map((r) => (
              <BlogPostCard key={r.id} post={r} language={language} onOpen={onOpenPost} compact />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
