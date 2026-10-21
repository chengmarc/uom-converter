// What search engines crawl by: sitemap.xml and robots.txt.

import { SITE_URL } from "./site";

/** Every page open to search, by its canonical address. */
export function sitemap(slugs: string[]): string {
  // No <lastmod>: the build doesn't know when a page last changed, and the build date would
  // say every page changes on every deploy, which teaches search engines to ignore the field.
  const urls = [SITE_URL, ...slugs.map((slug) => SITE_URL + slug)];
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n") +
    `\n</urlset>\n`
  );
}

// Search engines read robots.txt only at a domain's root, which is where the site lives.
export const robots = () => `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n`;
