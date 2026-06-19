/** Public HTTPS endpoints for blog RSS and sitemap (Cloud Functions). Set in .env at build time. */
export const BLOG_RSS_URL =
  import.meta.env.VITE_BLOG_RSS_URL ??
  'https://europe-west1-luna-nihongo.cloudfunctions.net/blogRss';

export const BLOG_SITEMAP_URL =
  import.meta.env.VITE_BLOG_SITEMAP_URL ??
  'https://europe-west1-luna-nihongo.cloudfunctions.net/blogSitemap';
