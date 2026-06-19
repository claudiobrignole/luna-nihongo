import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { LanguageType } from './Header';
import { listPublishedPosts } from '../services/blogService';
import type { BlogPost } from '../types/blog';
import { BlogPostCard } from './BlogPostCard';

interface BlogTeaserSectionProps {
  language: LanguageType;
  onOpenBlog: () => void;
  onOpenPost: (slug: string) => void;
}

export function BlogTeaserSection({ language, onOpenBlog, onOpenPost }: BlogTeaserSectionProps) {
  const lang = language;
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    void listPublishedPosts(2)
      .then(setPosts)
      .catch(() => setPosts([]));
  }, []);

  if (posts.length === 0) return null;

  return (
    <section className="mg-section blog-teaser-section">
      <div className="blog-teaser-header">
        <div>
          <p className="mg-index" style={{ color: 'var(--ln-red-deep)' }}>BLOG</p>
          <h2 className="mg-band-title">
            <span lang="ja">ぶろぐ</span>
            {lang === 'en' ? ' — tips & culture' : ' — consigli e cultura'}
          </h2>
        </div>
        <button type="button" className="mg-btn" onClick={onOpenBlog}>
          {lang === 'en' ? 'View all' : 'Vedi tutti'}
          <ArrowRight size={16} />
        </button>
      </div>
      <div className="blog-teaser-grid">
        {posts.map((post) => (
          <BlogPostCard key={post.id} post={post} language={language} onOpen={onOpenPost} compact />
        ))}
      </div>
    </section>
  );
}
