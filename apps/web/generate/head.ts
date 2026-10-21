// Each page's own head: what search engines and link previews read.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { token } from "@uom/brand/tokens";
import { HOME, type Page } from "../src/pages";
import { NAME, STORE_URL } from "../src/site";
import type { Drawn } from "./prerender";
import { BASE, esc, SITE_URL, WINDOWS } from "./site";

/** The preview image when a link is shared: the Windows app's Store promo (apps/windows/store/render.cjs). */
export const OG_IMAGE = resolve(WINDOWS, "store/listing/screenshot-1-promo.png");
const OG_ALT = "UOM Converter converting 12 AWG to 3.309 mm², with every converter listed beside it";

/** Width and height from a PNG's header. */
function pngSize(file: string): [number, number] {
  const b = readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

/** What a page is, for search engines: the home page, a converter, or a topic listing converters. */
export type Kind = "home" | "converter" | "topic";

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
    // The browser's bar takes the header's navy.
    `<meta name="theme-color" content="${token("brand", "light")}" media="(prefers-color-scheme: light)" />`,
    `<meta name="theme-color" content="${token("brand", "dark")}" media="(prefers-color-scheme: dark)" />`,
    `<link rel="manifest" href="${BASE}manifest.webmanifest" />`,
    `<link rel="apple-touch-icon" href="${BASE}icon-256.png" />`,
    // A data block, not a script: the page's CSP doesn't apply to it. A page kept out of search has none.
    ...(noindex ? [] : [`<script type="application/ld+json">${JSON.stringify(structuredData(page, kind, drawn, leaf)).replace(/</g, "\\u003c")}</script>`]),
  ].join("\n    ");
}

export function withHead(html: string, page: Page, kind: Kind, drawn: Drawn, leaf: string, noindex = false): string {
  const out = html.replace(/<title>[^<]*<\/title>\s*<meta name="description"[^>]*>/, head(page, kind, drawn, leaf, noindex));
  if (out === html) throw new Error("index.html: expected <title> followed by <meta name=\"description\">");
  return out;
}
