import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import type { LunaUser } from '../types/user';
import { BLOG_TAGS, blogTagLabel, slugifyTitle, type BlogPost, type BlogTag } from '../types/blog';
import { deletePost, listAllPostsAdmin, upsertPost } from '../services/blogService';
import { uploadBlogCover } from '../services/blogStorageService';
import { BlogMarkdown } from './BlogMarkdown';

interface AdminBlogPanelProps {
  language: 'en' | 'it';
  currentUser: LunaUser;
}

type LangTab = 'it' | 'en';

const emptyPost = (authorUid: string): Omit<BlogPost, 'id' | 'updatedAt'> => ({
  slug: '',
  published: false,
  publishedAt: new Date().toISOString(),
  tags: [],
  title: { it: '', en: '' },
  excerpt: { it: '', en: '' },
  body: { it: '', en: '' },
  coverImagePath: null,
  coverImageUrl: null,
  relatedSlugs: [],
  authorUid,
});

export function AdminBlogPanel({ language, currentUser }: AdminBlogPanelProps) {
  const lang = language;
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [langTab, setLangTab] = useState<LangTab>('it');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setPosts(await listAllPostsAdmin());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startNew = () => {
    setEditing({ ...emptyPost(currentUser.id), id: '', updatedAt: '' } as BlogPost);
    setLangTab('it');
    setError(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const slug = editing.slug.trim() || slugifyTitle(editing.title.it || editing.title.en);
      const saved = await upsertPost({
        ...editing,
        slug,
        publishedAt: editing.publishedAt || new Date().toISOString(),
        authorUid: currentUser.id,
      });
      setEditing(saved);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(lang === 'en' ? 'Delete this post?' : 'Eliminare questo articolo?')) return;
    setBusy(true);
    try {
      await deletePost(id);
      if (editing?.id === id) setEditing(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleCoverUpload = async (file: File) => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const postId = editing.id || `blog-${Date.now()}`;
      const { path, url } = await uploadBlogCover(postId, file);
      setEditing({ ...editing, id: postId, coverImagePath: path, coverImageUrl: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const toggleTag = (tag: BlogTag) => {
    if (!editing) return;
    const tags = editing.tags.includes(tag)
      ? editing.tags.filter((t) => t !== tag)
      : [...editing.tags, tag];
    setEditing({ ...editing, tags });
  };

  if (loading && posts.length === 0) {
    return (
      <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
        <Loader2 size={18} className="spin" />
        {lang === 'en' ? 'Loading blog…' : 'Caricamento blog…'}
      </p>
    );
  }

  return (
    <div className="blog-admin-editor">
      <p style={{ margin: '0 0 0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        {lang === 'en'
          ? 'Create or edit articles here. Toggle “Published” and save to show them on the blog.'
          : 'Crea o modifica gli articoli qui. Attiva «Pubblicato» e salva per mostrarli sul blog.'}
      </p>
      <details className="blog-admin-help">
        <summary>{lang === 'en' ? 'How to publish an article' : 'Come pubblicare un articolo'}</summary>
        <ol>
          <li>{lang === 'en' ? 'New post → fill slug, tags, cover (JPEG/PNG/WebP, max 2 MB).' : 'Nuovo articolo → slug, tag, cover (JPEG/PNG/WebP, max 2 MB).'}</li>
          <li>{lang === 'en' ? 'Write title, excerpt and body in Markdown (IT + EN tabs).' : 'Titolo, excerpt e corpo in Markdown (tab IT + EN).'}</li>
          <li>{lang === 'en' ? 'Inline images: Markdown only — ![alt](https://public-url.jpg). No upload in editor.' : 'Immagini nel testo: solo Markdown — ![alt](https://url-pubblico.jpg). Nessun upload inline.'}</li>
          <li>{lang === 'en' ? 'Check Published, Save, then open /#blog/{slug}.' : 'Spunta Pubblicato, Salva, poi apri /#blog/{slug}.'}</li>
        </ol>
        <p className="blog-admin-help-note">
          {lang === 'en'
            ? 'Without a cover, a default image is chosen from the first tag. Full guide: docs/BLOG.md in the repo.'
            : 'Senza cover, il sito usa un’immagine di fallback dal primo tag. Guida completa: docs/BLOG.md nel repo.'}
        </p>
      </details>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
        <button type="button" className="btn btn-primary" onClick={startNew}>
          <Plus size={16} />
          {lang === 'en' ? 'New post' : 'Nuovo articolo'}
        </button>
        {editing && (
          <button type="button" className="btn btn-accent" onClick={() => void handleSave()} disabled={busy}>
            <Save size={16} />
            {busy ? (lang === 'en' ? 'Saving…' : 'Salvataggio…') : (lang === 'en' ? 'Save' : 'Salva')}
          </button>
        )}
      </div>

      {error && <p className="mg-status-err">{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(0, 2fr)', gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1rem' }}>
          <h4 style={{ margin: '0 0 0.75rem' }}>{lang === 'en' ? 'Posts' : 'Articoli'}</h4>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {posts.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'space-between', fontSize: '0.82rem' }}
                  onClick={() => { setEditing(p); setError(null); }}
                >
                  <span>{p.title.it || p.title.en || p.slug}</span>
                  {!p.published && <span style={{ opacity: 0.6 }}>draft</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {editing ? (
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>slug</span>
              <input
                className="mg-input"
                style={{ width: '100%', marginTop: '0.25rem', borderRadius: 8 }}
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                placeholder={slugifyTitle(editing.title.it)}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.75rem 0' }}>
              <input
                type="checkbox"
                checked={editing.published}
                onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
              />
              {lang === 'en' ? 'Published' : 'Pubblicato'}
            </label>

            <div style={{ marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{lang === 'en' ? 'Tags' : 'Tag'}</span>
              <div className="blog-tag-filters" style={{ marginTop: '0.35rem', marginBottom: 0 }}>
                {BLOG_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`blog-tag-filter${editing.tags.includes(tag) ? ' active' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {blogTagLabel(tag, lang)}
                  </button>
                ))}
              </div>
            </div>

            <label style={{ display: 'block', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{lang === 'en' ? 'Cover image' : 'Immagine cover'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'block', marginTop: '0.35rem' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleCoverUpload(f);
                }}
              />
              {editing.coverImageUrl && (
                <img src={editing.coverImageUrl} alt="" style={{ maxWidth: 200, marginTop: '0.5rem', borderRadius: 8 }} />
              )}
            </label>

            <div className="blog-admin-lang-tabs">
              {(['it', 'en'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`blog-tag-filter${langTab === l ? ' active' : ''}`}
                  onClick={() => setLangTab(l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
              <button
                type="button"
                className={`blog-tag-filter${showPreview ? ' active' : ''}`}
                onClick={() => setShowPreview((v) => !v)}
                style={{ marginLeft: 'auto' }}
              >
                {showPreview ? (lang === 'en' ? 'Edit' : 'Modifica') : (lang === 'en' ? 'Preview' : 'Anteprima')}
              </button>
            </div>

            {!showPreview ? (
              <>
                <label style={{ display: 'block', marginTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{lang === 'en' ? 'Title' : 'Titolo'} ({langTab})</span>
                  <input
                    className="mg-input"
                    style={{ width: '100%', marginTop: '0.25rem', borderRadius: 8 }}
                    value={editing.title[langTab]}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        title: { ...editing.title, [langTab]: e.target.value },
                      })
                    }
                  />
                </label>
                <label style={{ display: 'block', marginTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Excerpt ({langTab})</span>
                  <textarea
                    className="blog-admin-textarea"
                    style={{ minHeight: 72 }}
                    value={editing.excerpt[langTab]}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        excerpt: { ...editing.excerpt, [langTab]: e.target.value },
                      })
                    }
                  />
                </label>
                <label style={{ display: 'block', marginTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Body Markdown ({langTab})</span>
                  <textarea
                    className="blog-admin-textarea"
                    value={editing.body[langTab]}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        body: { ...editing.body, [langTab]: e.target.value },
                      })
                    }
                  />
                </label>
              </>
            ) : (
              <div className="blog-admin-preview" style={{ marginTop: '0.75rem' }}>
                <h3>{editing.title[langTab]}</h3>
                <p style={{ color: 'var(--text-muted)' }}>{editing.excerpt[langTab]}</p>
                <BlogMarkdown content={editing.body[langTab]} />
              </div>
            )}

            <label style={{ display: 'block', marginTop: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{lang === 'en' ? 'Related slugs (comma-separated)' : 'Slug correlati (separati da virgola)'}</span>
              <input
                className="mg-input"
                style={{ width: '100%', marginTop: '0.25rem', borderRadius: 8 }}
                value={(editing.relatedSlugs ?? []).join(', ')}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    relatedSlugs: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
              />
            </label>

            {editing.id && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: '1rem', color: 'var(--error)' }}
                onClick={() => void handleDelete(editing.id)}
                disabled={busy}
              >
                <Trash2 size={16} />
                {lang === 'en' ? 'Delete post' : 'Elimina articolo'}
              </button>
            )}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>
            {lang === 'en' ? 'Select a post or create a new one.' : 'Seleziona un articolo o creane uno nuovo.'}
          </p>
        )}
      </div>
    </div>
  );
}
