// The website build: `npm run build:web` writes apps/web/dist/, served by Cloudflare Workers
// (wrangler.jsonc). It is the page in src/, plus:
//   <slug>.html         one page per converter (src/pages.ts), each with its own title,
//                       description and canonical address, so searches land on the converter.
//                       Cloudflare serves it at /<slug> (no .html, no slash), which is the
//                       address the canonical tag, sitemap and links use.
//                       Every page's <body> is drawn at build time (prerender below), so the
//                       HTML itself has the converter and links, not just an empty <main>.
//   404.html           served for unknown addresses
//   <topic>.html        one page per topic (src/pages.ts TOPIC_PAGES), listing its converters
//   sitemap.xml, robots.txt
//   llms.txt            the site and every converter, for AI assistants (llmstxt.org)
//   app-icon.svg        from @uom/brand's public folder, as in every app
//   manifest.webmanifest, sw.js, icons   install from the browser and use it offline
//   og.png              the preview image when a link is shared
//   _headers            caching rules for Cloudflare
//   _redirects          /<slug>.html and /index.html → the canonical address, permanently
// scripts/check-pages.mjs (`npm run check:web`) checks the result as search engines read it.
// The address it is served from is SITE_URL (default below); its path becomes Vite's base.

import { createHash } from "node:crypto";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { defineConfig, type Plugin } from "vite";
import type { Topic } from "@uom/converters/model";
import { HOME, PAGES, TOPIC_PAGES, type Page, type TopicPage } from "./src/pages";

const SITE_URL = (process.env.SITE_URL ?? "https://uom-converter.com/").replace(/\/?$/, "/");
const BASE = new URL(SITE_URL).pathname;
const OUT = resolve(__dirname, "dist");
const WINDOWS = resolve(__dirname, "../windows");
const NAME = "UOM Converter";
const STORE_URL = "https://apps.microsoft.com/detail/9PHZQBV736JC";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The preview image when a link is shared: the Windows app's Store promo (apps/windows/store/render.cjs). */
const OG_IMAGE = resolve(WINDOWS, "store/listing/screenshot-1-promo.png");
const OG_ALT = "UOM Converter converting 12 AWG to 3.309 mm², with every converter listed beside it";

/** Width and height from a PNG's header. */
function pngSize(file: string): [number, number] {
  const b = readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

/** What a page is, for search engines: the home page, a converter, or a topic listing converters. */
type Kind = "home" | "converter" | "topic";

/** A link as the page draws it: its text, and the absolute address. */
interface Link {
  name: string;
  url: string;
}

/**
 * What search engines read as data, as one graph: the site (home page); the page; on a converter's
 * page, the converter as a free web application; on a topic's page, the list of its converters;
 * and the page's breadcrumb trail, ending at `leaf`, the page's own name in that trail.
 */
function structuredData(page: Page, kind: Kind, drawn: Drawn, leaf: string): object {
  const url = SITE_URL + page.slug;
  const website = { "@id": `${SITE_URL}#website` };
  const webpage = {
    "@type": kind === "topic" ? "CollectionPage" : "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: `${page.title} | ${NAME}`,
    description: page.description,
    inLanguage: "en",
    isPartOf: website,
    mainEntity: { "@id": kind === "topic" ? `${url}#list` : `${url}#app` },
    primaryImageOfPage: { "@type": "ImageObject", url: `${SITE_URL}og.png` },
    ...(drawn.trail.length ? { breadcrumb: { "@id": `${url}#breadcrumb` } } : {}),
  };
  const graph: object[] = [webpage];
  if (kind === "home") {
    graph.unshift({ "@type": "WebSite", ...website, url: SITE_URL, name: NAME, description: HOME.description, inLanguage: "en" });
  }
  if (kind === "topic") {
    graph.push({
      "@type": "ItemList",
      "@id": `${url}#list`,
      itemListElement: drawn.items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, url: item.url })),
    });
  } else {
    graph.push(app(page, url));
  }
  if (drawn.trail.length) {
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [...drawn.trail, { name: leaf, url }].map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

/** A converter, or the home page's whole set of them, as a free web application. */
function app(page: Page, url: string): object {
  return {
    "@type": "WebApplication",
    "@id": `${url}#app`,
    name: page.slug ? page.title : NAME,
    url,
    description: page.description,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    ...(page.slug ? {} : { sameAs: [STORE_URL] }),
  };
}

/** The page's own head: title, description, canonical address, share preview, structured data and app manifest. */
function head(page: Page, kind: Kind, drawn: Drawn, leaf: string, noindex = false): string {
  const url = SITE_URL + page.slug;
  const title = esc(`${page.title} | ${NAME}`);
  const description = esc(page.description);
  const [width, height] = pngSize(OG_IMAGE);
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    noindex
      ? `<meta name="robots" content="noindex" />`
      : `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />\n    <link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${NAME}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${SITE_URL}og.png" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="${width}" />`,
    `<meta property="og:image:height" content="${height}" />`,
    `<meta property="og:image:alt" content="${esc(OG_ALT)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${SITE_URL}og.png" />`,
    `<meta name="twitter:image:alt" content="${esc(OG_ALT)}" />`,
    `<meta name="theme-color" content="#f7f6f3" media="(prefers-color-scheme: light)" />`,
    `<meta name="theme-color" content="#131312" media="(prefers-color-scheme: dark)" />`,
    `<link rel="manifest" href="${BASE}manifest.webmanifest" />`,
    `<link rel="apple-touch-icon" href="${BASE}icon-256.png" />`,
    // A data block, not a script: the page's CSP doesn't apply to it. A page kept out of search has none.
    ...(noindex ? [] : [`<script type="application/ld+json">${JSON.stringify(structuredData(page, kind, drawn, leaf)).replace(/</g, "\\u003c")}</script>`]),
  ].join("\n    ");
}

function withHead(html: string, page: Page, kind: Kind, drawn: Drawn, leaf: string, noindex = false): string {
  const out = html.replace(/<title>[^<]*<\/title>\s*<meta name="description"[^>]*>/, head(page, kind, drawn, leaf, noindex));
  if (out === html) throw new Error("index.html: expected <title> followed by <meta name=\"description\">");
  return out;
}

const BODY = /(<body>)([\s\S]*)(<\/body>)/;

/** A page as the site's script draws it, and what the build reads from it. */
interface Drawn {
  body: string;
  /** The page's <h1>. */
  name: string;
  /** The breadcrumb trail above the <h1>: the home page, then a converter's topic. */
  trail: Link[];
  /** A topic page's converters, in its list. */
  items: Link[];
  /** The region buttons: "US (NEC, 60 Hz)". */
  regions: string[];
}

/**
 * Each page's <body> as the site's script draws it at that address, so the HTML that's served
 * already has the converter, its explanation and the links to every other page: search engines,
 * link previews and readers without JavaScript get the page, not an empty <main>. The built
 * script runs in happy-dom, a browser for Node; in the browser it runs again and redraws the
 * page with the visitor's region. Drawn for the US, the region most visitors get.
 */
async function prerender(shell: string, paths: string[]): Promise<Drawn[]> {
  const src = shell.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/)?.[1];
  const body = shell.match(BODY)?.[2];
  if (!src || !body) throw new Error("index.html: expected the module script and a <body>");
  const script = pathToFileURL(join(OUT, src.slice(BASE.length))).href;
  const out: Drawn[] = [];
  for (const [i, path] of paths.entries()) {
    GlobalRegistrator.register({ url: new URL(path, SITE_URL).href });
    try {
      document.body.innerHTML = body;
      // A fresh copy of the script for each page: the query makes it a different module to Node.
      await import(`${script}?page=${i}`);
      // What was typed or picked is a property, which HTML doesn't keep: write it as the attribute.
      document.querySelectorAll("input").forEach((e) => e.setAttribute("value", e.value));
      document.querySelectorAll("option").forEach((e) => e.toggleAttribute("selected", e.selected));
      const name = document.querySelector("main h1")?.textContent?.trim();
      if (!name) throw new Error(`${path}: expected an <h1>`);
      const links = (selector: string) =>
        Array.from(document.querySelectorAll<HTMLAnchorElement>(selector), (a) => ({ name: (a.querySelector(".tile-title") ?? a).textContent!.trim(), url: new URL(a.href, SITE_URL).href }));
      out.push({
        body: document.body.innerHTML,
        name,
        trail: links("main .crumbs a"),
        items: links("main .topic-page > .tiles a"),
        regions: Array.from(document.querySelectorAll("#region button"), (b) => `${b.textContent} (${b.getAttribute("title")})`),
      });
    } finally {
      await GlobalRegistrator.unregister();
    }
  }
  return out;
}

const REPO_URL = "https://github.com/chengmarc/uom-converter";

/**
 * The site for AI assistants and the crawlers that feed them (https://llmstxt.org): what it is,
 * then every converter by topic, each linked to its page with the page's own description. Built
 * from the same pages as the sitemap, with the topics as the pages' breadcrumbs show them.
 */
function llmsTxt(converters: { page: Page; topic?: Topic }[], regions: string[]): string {
  const topics = new Map<Topic, Page[]>();
  for (const { page, topic } of converters) {
    if (!topic || !TOPIC_PAGES[topic]) throw new Error(`${page.slug}: no topic in its breadcrumb`);
    topics.set(topic, [...(topics.get(topic) ?? []), page]);
  }
  const item = (name: string, url: string, notes: string) => `- [${name}](${url}): ${notes}`;
  return [
    `# ${NAME}`,
    `> ${HOME.description}`,
    [
      `${NAME} is a free website with ${converters.length} converters and calculators for people who buy, sell, specify and install electrical products: suppliers, distributors, counter staff, electricians, engineers and product data (PIM) teams.`,
      `Every converter has its own page. The region picked in the page header sets the units, codes and frequency the converters use: ${regions.join(", ")}. The HTML of each page shows the converter with a worked example in US units and how it's calculated; every answer is worked out in the visitor's browser, with no account and nothing sent anywhere.`,
      `The home page, ${SITE_URL}, lists every converter.`,
    ].join("\n\n"),
    // Each topic's page first: it lists the converters under it.
    ...[...topics].map(([topic, pages]) => {
      const hub = TOPIC_PAGES[topic];
      return `## ${topic}\n\n${[hub, ...pages].map((p) => item(p.title, SITE_URL + p.slug, p.description)).join("\n")}`;
    }),
    `## Optional\n\n` +
      [
        item("Windows app", STORE_URL, "the same converters as a free Windows app from the Microsoft Store, working offline"),
        item("Source code", REPO_URL, "the website and apps, open source under the Apache 2.0 license"),
        item("Privacy", `${REPO_URL}/blob/main/PRIVACY.md`, "what the website and apps do and don't collect"),
        item("Sitemap", `${SITE_URL}sitemap.xml`, "every page's address"),
      ].join("\n"),
  ].join("\n\n") + "\n";
}

/** Offline copy: every page and asset cached on install, then served from cache and refreshed in the background. */
function serviceWorker(files: string[], version: string): string {
  return `// Written by apps/web/vite.config.ts.
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
    async closeBundle() {
      const shell = readFileSync(join(OUT, "index.html"), "utf8");
      const topics = Object.entries(TOPIC_PAGES) as [Topic, TopicPage][];
      const converters = Object.values(PAGES);
      // Every page but the home page and 404, which are open to search: the topics, then the converters.
      const pages = [...topics.map(([, page]) => page), ...converters];
      const all: { page: Page; kind: Kind; leaf?: string; noindex?: boolean }[] = [
        { page: HOME, kind: "home" },
        { page: { ...HOME, slug: "404", title: "Page not found" }, kind: "home", noindex: true },
        // A topic page's own name in its breadcrumb trail is the topic, as converter pages show it.
        ...topics.map(([topic, page]) => ({ page, kind: "topic" as const, leaf: topic })),
        ...converters.map((page) => ({ page, kind: "converter" as const })),
      ];
      const drawn = await prerender(shell, all.map(({ page }) => BASE + page.slug));
      all.forEach(({ page, kind, leaf, noindex }, i) => {
        const d = drawn[i];
        const html = withHead(shell, page, kind, d, leaf ?? d.name, noindex).replace(BODY, (_, open, __, close) => open + d.body + close);
        writeFileSync(join(OUT, `${page.slug || "index"}.html`), html);
      });

      // No <lastmod>: the build doesn't know when a page last changed, and the build date would
      // say every page changes on every deploy, which teaches search engines to ignore the field.
      const urls = [SITE_URL, ...pages.map((p) => SITE_URL + p.slug)];
      writeFileSync(
        join(OUT, "sitemap.xml"),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n") +
          `\n</urlset>\n`,
      );
      const firstConverter = all.length - converters.length;
      const topicOf = (i: number) => drawn[firstConverter + i].trail.at(-1)?.name as Topic | undefined;
      writeFileSync(join(OUT, "llms.txt"), llmsTxt(converters.map((page, i) => ({ page, topic: topicOf(i) })), drawn[0].regions));
      // Search engines read robots.txt only at a domain's root, which is where the site lives.
      writeFileSync(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n`);

      // Rendered for the Windows app by apps/windows/store/render.cjs.
      copyFileSync(resolve(WINDOWS, "packaging/appx/Square44x44Logo.targetsize-256_altform-unplated.png"), join(OUT, "icon-256.png"));
      copyFileSync(OG_IMAGE, join(OUT, "og.png"));
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
            background_color: "#f7f6f3",
            theme_color: "#f7f6f3",
            icons: [
              { src: `${BASE}app-icon.svg`, sizes: "any", type: "image/svg+xml" },
              { src: `${BASE}icon-256.png`, sizes: "256x256", type: "image/png" },
            ],
          },
          null,
          2,
        ),
      );

      // Pictures (the Windows app's screenshots, the photos at every width) are left to be cached
      // when first shown: the offline copy is for the converters.
      const offline = assets.filter((a) => ![".png", ".webp"].some((ext) => a.endsWith(ext)));
      const files = [BASE, ...pages.map((p) => BASE + p.slug), ...offline.map((a) => BASE + a), `${BASE}app-icon.svg`, `${BASE}icon-256.png`];
      // Asset names carry a content hash, so a new build with any change gets a new cache.
      const version = createHash("sha256").update(JSON.stringify(files) + JSON.stringify(pages)).digest("hex").slice(0, 12);
      writeFileSync(join(OUT, "sw.js"), serviceWorker(files, version));

      // Files under assets/ are named by their content, so they can be cached for good. Everything
      // else (pages, sw.js, the manifest) keeps one address across builds and is checked each time,
      // so a deploy reaches visitors (and the offline copy) on their next visit.
      writeFileSync(
        join(OUT, "_headers"),
        `/*\n  Cache-Control: no-cache\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n\n` +
          `${BASE}assets/*\n  ! Cache-Control\n  Cache-Control: public, max-age=31536000, immutable\n`,
      );
      // Cloudflare already redirects these spellings, but with a 307 (temporary). A 301 tells
      // search engines the extensionless address is the one to keep. 404.html is left out on purpose.
      writeFileSync(
        join(OUT, "_redirects"),
        [`${BASE}index.html ${BASE} 301`, ...pages.map((p) => `${BASE}${p.slug}.html ${BASE}${p.slug} 301`)].join("\n") + "\n",
      );
    },
  };
}

export default defineConfig({
  root: resolve(__dirname, "src"),
  publicDir: resolve(__dirname, "../../packages/brand/public"),
  base: BASE,
  define: { __SITE_BASE__: JSON.stringify(BASE) },
  build: { outDir: OUT, emptyOutDir: true },
  plugins: [sitePages()],
});
