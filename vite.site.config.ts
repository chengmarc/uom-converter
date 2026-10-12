// The website build: `npm run build:site` writes site/, published to GitHub Pages by
// .github/workflows/pages.yml. It is the same page as the desktop app, plus:
//   <slug>/index.html   one page per converter (src/web/pages.ts), each with its own title,
//                       description and canonical address, so searches land on the converter
//   404.html            GitHub Pages' fallback for unknown addresses
//   sitemap.xml, robots.txt
//   manifest.webmanifest, sw.js, icons   install from the browser and use it offline
//   og.png              the preview image when a link is shared
// The address it is served from is SITE_URL (default below); its path becomes Vite's base.

import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import { HOME, PAGES, type Page } from "./src/web/pages";

const SITE_URL = (process.env.SITE_URL ?? "https://uom-converter.com/").replace(/\/?$/, "/");
const BASE = new URL(SITE_URL).pathname;
const OUT = resolve(__dirname, "site");
const NAME = "UOM Converter";
const STORE_URL = "https://apps.microsoft.com/detail/9PHZQBV736JC";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The page's own head: title, description, canonical address, share preview and app manifest. */
function head(page: Page, noindex = false): string {
  const url = SITE_URL + (page.slug ? `${page.slug}/` : "");
  const title = `${page.title} | ${NAME}`;
  const ld = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: page.slug ? page.title : NAME,
    url,
    description: page.description,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    ...(page.slug ? { isPartOf: { "@type": "WebSite", name: NAME, url: SITE_URL } } : { sameAs: [STORE_URL] }),
  };
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    noindex ? `<meta name="robots" content="noindex" />` : `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${NAME}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${SITE_URL}og.png" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="theme-color" content="#f6f5f2" media="(prefers-color-scheme: light)" />`,
    `<meta name="theme-color" content="#141412" media="(prefers-color-scheme: dark)" />`,
    `<link rel="manifest" href="${BASE}manifest.webmanifest" />`,
    `<link rel="apple-touch-icon" href="${BASE}icon-256.png" />`,
    // A data block, not a script: the page's CSP doesn't apply to it.
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`,
  ].join("\n    ");
}

function withHead(html: string, page: Page, noindex = false): string {
  const out = html.replace(/<title>[^<]*<\/title>\s*<meta name="description"[^>]*>/, head(page, noindex));
  if (out === html) throw new Error("index.html: expected <title> followed by <meta name=\"description\">");
  return out;
}

/** Offline copy: every page and asset cached on install, then served from cache and refreshed in the background. */
function serviceWorker(files: string[], version: string): string {
  return `// Written by vite.site.config.ts.
const CACHE = "uom-${version}";
const FILES = ${JSON.stringify(files)};
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("uom-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // Pages are cached without their ?for= and ?region= settings.
      const cached = await cache.match(req, { ignoreSearch: req.mode === "navigate" });
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req.mode === "navigate" ? req.url.split("?")[0] : req, res.clone());
          return res;
        })
        // Offline and not cached: any page will do for a converter's address, since the page picks the converter.
        .catch(async () => cached || (req.mode === "navigate" && (await cache.match(${JSON.stringify(BASE)}))) || Response.error());
      return cached ?? fresh;
    }),
  );
});
`;
}

function sitePages(): Plugin {
  let assets: string[] = [];
  return {
    name: "uom-site-pages",
    apply: "build",
    generateBundle(_, bundle) {
      assets = Object.keys(bundle).filter((f) => f !== "index.html");
    },
    closeBundle() {
      const shell = readFileSync(join(OUT, "index.html"), "utf8");
      const pages = Object.values(PAGES);
      writeFileSync(join(OUT, "index.html"), withHead(shell, HOME));
      writeFileSync(join(OUT, "404.html"), withHead(shell, { ...HOME, title: "Page not found" }, true));
      for (const page of pages) {
        mkdirSync(join(OUT, page.slug), { recursive: true });
        writeFileSync(join(OUT, page.slug, "index.html"), withHead(shell, page));
      }

      const today = new Date().toISOString().slice(0, 10);
      const urls = [SITE_URL, ...pages.map((p) => `${SITE_URL}${p.slug}/`)];
      writeFileSync(
        join(OUT, "sitemap.xml"),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join("\n") +
          `\n</urlset>\n`,
      );
      // Search engines read robots.txt only at a domain's root, which is where the site lives.
      writeFileSync(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n`);

      copyFileSync(resolve(__dirname, "src/web/app-icon.svg"), join(OUT, "icon.svg"));
      copyFileSync(resolve(__dirname, "store/appx/Square44x44Logo.targetsize-256_altform-unplated.png"), join(OUT, "icon-256.png"));
      copyFileSync(resolve(__dirname, "store/listing/screenshot-1-promo.png"), join(OUT, "og.png"));
      writeFileSync(
        join(OUT, "manifest.webmanifest"),
        JSON.stringify(
          {
            name: NAME,
            short_name: "UOM",
            description: HOME.description,
            start_url: BASE,
            scope: BASE,
            display: "standalone",
            background_color: "#f6f5f2",
            theme_color: "#f6f5f2",
            icons: [
              { src: `${BASE}icon.svg`, sizes: "any", type: "image/svg+xml" },
              { src: `${BASE}icon-256.png`, sizes: "256x256", type: "image/png" },
            ],
          },
          null,
          2,
        ),
      );

      const files = [BASE, ...pages.map((p) => `${BASE}${p.slug}/`), ...assets.map((a) => BASE + a), `${BASE}icon.svg`, `${BASE}icon-256.png`];
      // Asset names carry a content hash, so a new build with any change gets a new cache.
      const version = createHash("sha256").update(JSON.stringify(files) + JSON.stringify(PAGES)).digest("hex").slice(0, 12);
      writeFileSync(join(OUT, "sw.js"), serviceWorker(files, version));
    },
  };
}

export default defineConfig({
  root: resolve(__dirname, "src/web"),
  base: BASE,
  define: { __SITE_BASE__: JSON.stringify(BASE) },
  build: { outDir: OUT, emptyOutDir: true },
  plugins: [sitePages()],
});
