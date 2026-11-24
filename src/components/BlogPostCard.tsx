import { ArrowRight } from 'lucide-react';
import type { LanguageType } from './Header';
import type { BlogPost } from '../types/blog';
import { blogTagLabel } from '../types/blog';
import { resolveBlogCoverUrl, resolveBlogCoverAlt } from '../content/blogCoverFallbacks';
import { buildPath } from '../utils/routes';
import { handleInternalNavClick } from '../utils/navLink';

interface BlogPostCardProps {
  post: BlogPost;
  language: LanguageType;
  onOpen: (slug: string) => void;
  compact?: boolean;
}

export function BlogPostCard({ post, language, onOpen, compact }: BlogPostCardProps) {
  const lang = language;
  const coverUrl = resolveBlogCoverUrl(post);
  const coverAlt = resolveBlogCoverAlt(post, lang);
  const href = buildPath('blog', lang, post.slug);
  const onClick = handleInternalNavClick(() => onOpen(post.slug));

  return (
    <article className={`blog-card${compact ? ' blog-card--compact' : ''}`}>
      <a href={href} className="blog-card-cover" onClick={onClick}>
        <img src={coverUrl} alt={coverAlt} />
      </a>
      <div className="blog-card-body">
        <div className="blog-card-tags">
          {post.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="blog-tag">
              {blogTagLabel(tag, lang)}
            </span>
          ))}
        </div>
        <h3>
          <a href={href} className="blog-card-title" onClick={onClick}>
            {post.title[lang]}
          </a>
        </h3>
        <p className="blog-card-excerpt">{post.excerpt[lang]}</p>
        <a href={href} className="mg-btn mg-btn--red blog-card-cta" onClick={onClick}>
          {lang === 'en' ? 'Read more' : 'Leggi'}
          <ArrowRight size={14} />
        </a>
      </div>
    </article>
  );
}
