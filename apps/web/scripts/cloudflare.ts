// How Cloudflare serves the site (wrangler.jsonc): _headers and _redirects.

import { BASE } from "./site";

// Files under assets/ are named by their content, so they can be cached for good. Everything
// else (pages, sw.js, the manifest) keeps one address across builds and is checked each time,
// so a deploy reaches visitors (and the offline copy) on their next visit.
export const headers = () =>
  `/*\n  Cache-Control: no-cache\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n\n` +
  `${BASE}assets/*\n  ! Cache-Control\n  Cache-Control: public, max-age=31536000, immutable\n`;

/** Pages that have moved, so old links and search results still land. */
const MOVED: Record<string, string> = { electrical: "power-and-loads" };

/** Converters' addresses from before they moved into their topic's folder: the slug without it. */
const unfoldered = (slugs: string[]) => Object.fromEntries(slugs.filter((s) => s.includes("/")).map((s) => [s.split("/").at(-1)!, s]));

// Cloudflare already redirects these spellings, but with a 307 (temporary). A 301 tells
// search engines the extensionless address is the one to keep. 404.html is left out on purpose.
export const redirects = (slugs: string[]) =>
  [
    `${BASE}index.html ${BASE} 301`,
    ...slugs.map((slug) => `${BASE}${slug}.html ${BASE}${slug} 301`),
    ...Object.entries({ ...MOVED, ...unfoldered(slugs) }).flatMap(([from, to]) => [`${BASE}${from} ${BASE}${to} 301`, `${BASE}${from}.html ${BASE}${to} 301`]),
  ].join("\n") + "\n";
