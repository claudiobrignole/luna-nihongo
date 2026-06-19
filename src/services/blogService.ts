import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';
import type { BlogPost, BlogPostInput, BlogTag } from '../types/blog';

const COLLECTION = 'blogPosts';

function docToPost(id: string, data: Record<string, unknown>): BlogPost {
  const tags = Array.isArray(data.tags) ? data.tags.filter((t): t is BlogTag => typeof t === 'string') : [];
  return {
    id,
    slug: String(data.slug ?? id),
    published: data.published === true,
    publishedAt: String(data.publishedAt ?? ''),
    tags,
    title: {
      it: String((data.title as { it?: string })?.it ?? data.titleIt ?? ''),
      en: String((data.title as { en?: string })?.en ?? data.titleEn ?? ''),
    },
    excerpt: {
      it: String((data.excerpt as { it?: string })?.it ?? data.excerptIt ?? ''),
      en: String((data.excerpt as { en?: string })?.en ?? data.excerptEn ?? ''),
    },
    body: {
      it: String((data.body as { it?: string })?.it ?? data.bodyIt ?? ''),
      en: String((data.body as { en?: string })?.en ?? data.bodyEn ?? ''),
    },
    coverImagePath: data.coverImagePath != null ? String(data.coverImagePath) : null,
    coverImageUrl: data.coverImageUrl != null ? String(data.coverImageUrl) : null,
    relatedSlugs: Array.isArray(data.relatedSlugs) ? data.relatedSlugs.map(String) : undefined,
    updatedAt: String(data.updatedAt ?? ''),
    authorUid: String(data.authorUid ?? ''),
  };
}

function postToFirestore(post: BlogPostInput, now: string) {
  return {
    slug: post.slug,
    published: post.published,
    publishedAt: post.publishedAt,
    tags: post.tags,
    title: post.title,
    excerpt: post.excerpt,
    body: post.body,
    coverImagePath: post.coverImagePath ?? null,
    coverImageUrl: post.coverImageUrl ?? null,
    relatedSlugs: post.relatedSlugs ?? [],
    updatedAt: now,
    authorUid: post.authorUid,
  };
}

export async function listPublishedPosts(limit?: number): Promise<BlogPost[]> {
  const q = query(
    collection(getFirebaseDb(), COLLECTION),
    where('published', '==', true),
    orderBy('publishedAt', 'desc'),
  );
  const snap = await getDocs(q);
  const posts = snap.docs.map((d) => docToPost(d.id, d.data() as Record<string, unknown>));
  return limit ? posts.slice(0, limit) : posts;
}

export async function listAllPostsAdmin(): Promise<BlogPost[]> {
  const snap = await getDocs(collection(getFirebaseDb(), COLLECTION));
  return snap.docs
    .map((d) => docToPost(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const q = query(collection(getFirebaseDb(), COLLECTION), where('slug', '==', slug));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return docToPost(d.id, d.data() as Record<string, unknown>);
}

export async function getPostById(id: string): Promise<BlogPost | null> {
  const snap = await getDoc(doc(getFirebaseDb(), COLLECTION, id));
  if (!snap.exists()) return null;
  return docToPost(snap.id, snap.data() as Record<string, unknown>);
}

export async function upsertPost(post: BlogPostInput): Promise<BlogPost> {
  const now = new Date().toISOString();
  const id = post.id ?? `blog-${Date.now()}`;
  const data = postToFirestore(post, now);
  await setDoc(doc(getFirebaseDb(), COLLECTION, id), data, { merge: true });
  return { ...post, id, updatedAt: now } as BlogPost;
}

export async function deletePost(id: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), COLLECTION, id));
}

export function filterPostsByTag(posts: BlogPost[], tag: BlogTag | null): BlogPost[] {
  if (!tag) return posts;
  return posts.filter((p) => p.tags.includes(tag));
}

export function relatedPosts(
  current: BlogPost,
  all: BlogPost[],
  max = 3,
): BlogPost[] {
  if (current.relatedSlugs?.length) {
    const manual = current.relatedSlugs
      .map((slug) => all.find((p) => p.slug === slug && p.slug !== current.slug))
      .filter((p): p is BlogPost => Boolean(p));
    if (manual.length > 0) return manual.slice(0, max);
  }
  const scored = all
    .filter((p) => p.slug !== current.slug && p.published)
    .map((p) => ({
      post: p,
      score: p.tags.filter((t) => current.tags.includes(t)).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.post.publishedAt.localeCompare(a.post.publishedAt));
  return scored.slice(0, max).map((x) => x.post);
}
