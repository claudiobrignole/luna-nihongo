import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';

const SITE_ORIGIN = 'https://lunanihongo.com';

interface BlogDoc {
  slug: string;
  published: boolean;
  publishedAt: string;
  updatedAt: string;
  title: { it: string; en: string };
  excerpt: { it: string; en: string };
  coverImageUrl?: string | null;
}

async function loadPublishedPosts(): Promise<BlogDoc[]> {
  const snap = await getFirestore()
    .collection('blogPosts')
    .where('published', '==', true)
    .orderBy('publishedAt', 'desc')
    .limit(50)
    .get();

  return snap.docs.map((d) => d.data() as BlogDoc);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const blogRss = onRequest(
  { region: 'europe-west1', invoker: 'public' },
  async (req, res) => {
    const lang = req.query.lang === 'en' ? 'en' : 'it';
    const posts = await loadPublishedPosts();

    const items = posts
      .map((p) => {
        const link = `${SITE_ORIGIN}/#blog/${p.slug}`;
        const enclosure = p.coverImageUrl
          ? `<enclosure url="${escapeXml(p.coverImageUrl)}" type="image/jpeg" />`
          : '';
        return `<item>
  <title>${escapeXml(p.title[lang])}</title>
  <link>${escapeXml(link)}</link>
  <guid isPermaLink="true">${escapeXml(link)}</guid>
  <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
  <description>${escapeXml(p.excerpt[lang])}</description>
  ${enclosure}
</item>`;
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Luna Nihongo Blog</title>
  <link>${SITE_ORIGIN}/#blog</link>
  <description>${lang === 'en' ? 'Japanese tips and culture from Luna Nihongo' : 'Consigli e cultura giapponese da Luna Nihongo'}</description>
  <language>${lang === 'en' ? 'en' : 'it'}</language>
${items}
</channel>
</rss>`;

    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.status(200).send(xml);
  },
);

type SitemapEntry = {
  loc: string;
  changefreq: string;
  priority: string;
  lastmod?: string;
};

export const blogSitemap = onRequest(
  { region: 'europe-west1', invoker: 'public' },
  async (_req, res) => {
    const posts = await loadPublishedPosts();

    const staticUrls: SitemapEntry[] = [
      { loc: `${SITE_ORIGIN}/`, changefreq: 'weekly', priority: '1.0' },
      { loc: `${SITE_ORIGIN}/#blog`, changefreq: 'weekly', priority: '0.8' },
    ];

    const postUrls: SitemapEntry[] = posts.map((p) => ({
      loc: `${SITE_ORIGIN}/#blog/${p.slug}`,
      lastmod: p.updatedAt || p.publishedAt,
      changefreq: 'monthly',
      priority: '0.6',
    }));

    const urls = [...staticUrls, ...postUrls]
      .map((u) => {
        const lastmod = u.lastmod
          ? `<lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>`
          : '';
        return `<url>
  <loc>${escapeXml(u.loc)}</loc>
  ${lastmod}
  <changefreq>${u.changefreq}</changefreq>
  <priority>${u.priority}</priority>
</url>`;
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(xml);
  },
);
