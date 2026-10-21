// The website build: `npm run web:build` writes apps/web/dist/, served by Cloudflare Workers
// (wrangler.jsonc). It is the page in src/, plus what sitePages() below writes, each from its
// module in generate/:
//   <slug>.html         one page per converter (src/pages.ts), each with its own title,
//                       description and canonical address, so searches land on the converter.
//                       Cloudflare serves it at /<slug> (no .html, no slash), which is the
//                       address the canonical tag, sitemap and links use.
//                       Every page's <body> is drawn at build time (prerender.ts) and its head
//                       written (head.ts), so the HTML itself has the converter and links, not
//                       just an empty <main>.
//   404.html            served for unknown addresses
//   <topic>.html        one page per topic (src/pages.ts TOPIC_PAGES), listing its converters
//   sitemap.xml, robots.txt                   crawl.ts
//   llms.txt            the site and every converter, for AI assistants (llmstxt.org; llms-txt.ts)
//   manifest.webmanifest, sw.js, icons        offline.ts: install from the browser and use it offline
//   og.png              the preview image when a link is shared
//   _headers, _redirects                      cloudflare.ts: caching rules, and /<slug>.html and
//                                             /index.html → the canonical address, permanently
// app-icon.svg is @uom/brand's (its vite.ts), as in every app. scripts/check-pages.mjs
// (`npm run web:check`) checks the result as search engines read it. The address it is served
// from is SITE_URL (generate/site.ts); its path becomes Vite's base.

import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import type { Topic } from "@uom/converters/model";
import { appIcon, photos } from "@uom/brand/vite";
import { HOME, PAGES, TOPIC_PAGES, type Page, type TopicPage } from "./src/pages";
import { headers, redirects } from "./generate/cloudflare";
import { robots, sitemap } from "./generate/crawl";
import { OG_IMAGE, withHead, type Kind } from "./generate/head";
import { llmsTxt } from "./generate/llms-txt";
import { manifest, serviceWorker } from "./generate/offline";
import { BODY, prerender } from "./generate/prerender";
import { BASE, OUT } from "./generate/site";

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
      const slugs = pages.map((p) => p.slug);
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

      writeFileSync(join(OUT, "sitemap.xml"), sitemap(slugs));
      const firstConverter = all.length - converters.length;
      const topicOf = (i: number) => drawn[firstConverter + i].trail.at(-1)?.name as Topic | undefined;
      writeFileSync(join(OUT, "llms.txt"), llmsTxt(converters.map((page, i) => ({ page, topic: topicOf(i) })), drawn[0].regions));
      writeFileSync(join(OUT, "robots.txt"), robots());

      copyFileSync(createRequire(import.meta.url).resolve("@uom/brand/icon-256.png"), join(OUT, "icon-256.png"));
      copyFileSync(OG_IMAGE, join(OUT, "og.png"));
      writeFileSync(join(OUT, "manifest.webmanifest"), manifest());

      // Pictures (the Windows app's screenshots, the photos at every width) are left to be cached
      // when first shown: the offline copy is for the converters.
      const offline = assets.filter((a) => ![".png", ".webp"].some((ext) => a.endsWith(ext)));
      const files = [BASE, ...pages.map((p) => BASE + p.slug), ...offline.map((a) => BASE + a), `${BASE}app-icon.svg`, `${BASE}icon-256.png`];
      // Asset names carry a content hash, so a new build with any change gets a new cache.
      const version = createHash("sha256").update(JSON.stringify(files) + JSON.stringify(pages)).digest("hex").slice(0, 12);
      writeFileSync(join(OUT, "sw.js"), serviceWorker(files, version));

      writeFileSync(join(OUT, "_headers"), headers());
      writeFileSync(join(OUT, "_redirects"), redirects(slugs));
    },
  };
}

export default defineConfig({
  root: resolve(__dirname, "src"),
  publicDir: false,
  base: BASE,
  define: { __SITE_BASE__: JSON.stringify(BASE) },
  build: { outDir: OUT, emptyOutDir: true },
  plugins: [appIcon(), photos(), sitePages()],
});
