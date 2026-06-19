import { ArrowRight } from 'lucide-react';
import type { LanguageType } from './Header';
import type { BlogPost } from '../types/blog';
import { blogTagLabel } from '../types/blog';
import { resolveBlogCoverUrl } from '../content/blogCoverFallbacks';

interface BlogPostCardProps {
  post: BlogPost;
  language: LanguageType;
  onOpen: (slug: string) => void;
  compact?: boolean;
}

export function BlogPostCard({ post, language, onOpen, compact }: BlogPostCardProps) {
  const lang = language;
  const coverUrl = resolveBlogCoverUrl(post);

  return (
    <article className={`blog-card${compact ? ' blog-card--compact' : ''}`}>
      <button type="button" className="blog-card-cover mg-zoom-media" onClick={() => onOpen(post.slug)}>
        <img src={coverUrl} alt="" />
      </button>
      <div className="blog-card-body">
        <div className="blog-card-tags">
          {post.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="blog-tag">
              {blogTagLabel(tag, lang)}
            </span>
          ))}
        </div>
        <h3>
          <button type="button" className="blog-card-title" onClick={() => onOpen(post.slug)}>
            {post.title[lang]}
          </button>
        </h3>
        <p className="blog-card-excerpt">{post.excerpt[lang]}</p>
        <button type="button" className="mg-btn mg-btn--red blog-card-cta" onClick={() => onOpen(post.slug)}>
          {lang === 'en' ? 'Read more' : 'Leggi'}
          <ArrowRight size={14} />
        </button>
      </div>
    </article>
  );
}
