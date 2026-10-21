// Checks the built website (apps/web/dist/) the way a search engine or link preview reads it:
// every page's title, description, canonical address, share tags, structured data and heading,
// the sitemap and llms.txt, and the links between pages. `npm run web:check`, after `npm run web:build`.
// Exits non-zero, listing every problem, if anything is off.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const SITE_URL = (process.env.SITE_URL ?? "https://uom-converter.com/").replace(/\/?$/, "/");
const BASE = new URL(SITE_URL).pathname;
const DIST = resolve(import.meta.dirname, "../dist");
const SUFFIX = " | UOM Converter";
// Longer than this and search results cut them off.
const TITLE_MAX = 70;
const DESCRIPTION = [70, 160];

const errors = [];
const fail = (file, message) => errors.push(`${file}: ${message}`);

const unescape = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const meta = (html, attr, key) => {
  const m = html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`));
  return m ? unescape(m[1]) : undefined;
};
const all = (html, re) => [...html.matchAll(re)].map((m) => m[1]);

if (!existsSync(DIST)) {
  console.error(`No ${DIST}: run npm run web:build first.`);
  process.exit(1);
}

const files = readdirSync(DIST).filter((f) => f.endsWith(".html"));
const indexed = new Map(); // canonical address → file
const titles = new Map();
const descriptions = new Map();
/** [file, address, what] for addresses in structured data that must be indexed pages. */
const pointsAt = [];

for (const file of files) {
  const html = readFileSync(join(DIST, file), "utf8");
  const slug = file === "index.html" ? "" : file.replace(/\.html$/, "");
  const url = SITE_URL + slug;

  // In <head>: the diagrams in <body> have their own SVG <title>s.
  const titleTags = all(html.split("</head>")[0], /<title>([^<]*)<\/title>/g);
  if (titleTags.length !== 1) fail(file, `${titleTags.length} <title> tags`);
  const title = unescape(titleTags[0] ?? "");
  if (!title.endsWith(SUFFIX) || title === SUFFIX) fail(file, `title "${title}" doesn't end in "${SUFFIX}"`);
  if (title.length > TITLE_MAX) fail(file, `title is ${title.length} characters, over ${TITLE_MAX}`);

  const description = meta(html, "name", "description") ?? "";
  if (description.length < DESCRIPTION[0] || description.length > DESCRIPTION[1]) {
    fail(file, `description is ${description.length} characters, not ${DESCRIPTION[0]}–${DESCRIPTION[1]}`);
  }

  for (const [attr, key, want] of [
    ["property", "og:title", title],
    ["name", "twitter:title", title],
    ["property", "og:description", description],
    ["name", "twitter:description", description],
  ]) {
    if (meta(html, attr, key) !== want) fail(file, `${key} doesn't match the page's own`);
  }
  for (const [attr, key] of [
    ["property", "og:image:alt"],
    ["name", "twitter:image:alt"],
  ]) {
    if (!meta(html, attr, key)) fail(file, `no ${key}`);
  }

  const image = meta(html, "property", "og:image");
  if (image !== `${SITE_URL}og.png`) fail(file, `og:image is ${image}`);
  else {
    const png = readFileSync(join(DIST, "og.png"));
    const size = [png.readUInt32BE(16), png.readUInt32BE(20)].map(String);
    const said = [meta(html, "property", "og:image:width"), meta(html, "property", "og:image:height")];
    if (said.join("×") !== size.join("×")) fail(file, `og:image is ${size.join("×")}, the page says ${said.join("×")}`);
  }

  const robots = meta(html, "name", "robots") ?? "";
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  const ld = all(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);

  if (/noindex/.test(robots)) {
    // Kept out of search: nothing that claims an address for it.
    if (canonical) fail(file, "noindex, but has a canonical address");
    if (ld.length) fail(file, "noindex, but has structured data");
  } else {
    if (!/\bindex\b/.test(robots)) fail(file, `robots is "${robots}"`);
    if (canonical !== url) fail(file, `canonical is ${canonical}, not ${url}`);
    if (meta(html, "property", "og:url") !== url) fail(file, `og:url isn't ${url}`);
    indexed.set(url, file);
    if (titles.has(title)) fail(file, `same title as ${titles.get(title)}`);
    titles.set(title, file);
    if (descriptions.has(description)) fail(file, `same description as ${descriptions.get(description)}`);
    descriptions.set(description, file);

    if (ld.length !== 1) fail(file, `${ld.length} structured data blocks`);
    else {
      let graph = [];
      try {
        graph = JSON.parse(ld[0])["@graph"] ?? [];
      } catch (e) {
        fail(file, `structured data isn't JSON: ${e.message}`);
      }
      const of = (type) => graph.filter((n) => n["@type"] === type);
      // A topic's page is a collection listing its converters; any other page is about one application.
      const collection = of("CollectionPage")[0];
      if ((collection ?? of("WebPage")[0])?.url !== url) fail(file, "no WebPage or CollectionPage at the page's address");
      if (collection) {
        const items = of("ItemList")[0]?.itemListElement ?? [];
        if (!items.length) fail(file, "a CollectionPage with no ItemList");
        for (const it of items) pointsAt.push([file, it.url, "list item"]);
      } else if (of("WebApplication")[0]?.url !== url) fail(file, "no WebApplication at the page's address");
      if (slug) {
        const trail = of("BreadcrumbList")[0]?.itemListElement ?? [];
        if (trail.at(-1)?.item !== url || trail[0]?.item !== SITE_URL) fail(file, "breadcrumb doesn't run from the home page to this one");
        for (const c of trail.slice(1, -1)) pointsAt.push([file, c.item, "breadcrumb"]);
      } else if (!of("WebSite").length) fail(file, "no WebSite");
    }
  }

  // The page as drawn at build time, not an empty shell.
  const main = html.match(/<main[^>]*>([\s\S]*)<\/main>/)?.[1] ?? "";
  // Its text, without the icon some headings start with.
  const h1 = all(main, /<h1[^>]*>([\s\S]*?)<\/h1>/g).map((h) => h.replace(/<[^>]*>/g, ""));
  if (h1.length !== 1 || !h1[0].trim()) fail(file, `${h1.length} <h1> in <main>`);
  if (main.replace(/<[^>]*>/g, "").trim().length < 200) fail(file, "<main> has almost no text");

  // Links to the site's own pages and files go somewhere.
  for (const href of new Set(all(html, /<a [^>]*href="([^"]*)"/g))) {
    const path = href.split(/[?#]/)[0];
    if (!path.startsWith(BASE)) continue;
    const rest = path.slice(BASE.length);
    if (!(rest === "" || existsSync(join(DIST, `${rest}.html`)) || existsSync(join(DIST, rest)))) fail(file, `link to ${href} goes nowhere`);
  }
}

// Structured data names only pages open to search (checked once every page has been read).
for (const [file, url, what] of pointsAt) if (!indexed.has(url)) fail(file, `${what} ${url} isn't an indexed page`);

// The sitemap lists exactly the pages that are open to search.
const sitemap = all(readFileSync(join(DIST, "sitemap.xml"), "utf8"), /<loc>([^<]*)<\/loc>/g);
for (const loc of sitemap) if (!indexed.has(loc)) fail("sitemap.xml", `${loc} isn't an indexed page`);
for (const url of indexed.keys()) if (!sitemap.includes(url)) fail("sitemap.xml", `${url} is missing`);

// llms.txt links every indexed page, and only those, by its canonical address.
const llms = readFileSync(join(DIST, "llms.txt"), "utf8");
const linked = all(llms, /\]\(([^)]*)\)/g).filter((u) => u.startsWith(SITE_URL) && !u.endsWith(".xml"));
for (const url of linked) if (!indexed.has(url)) fail("llms.txt", `${url} isn't an indexed page`);
for (const url of indexed.keys()) if (!llms.includes(url)) fail("llms.txt", `${url} is missing`);

if (errors.length) {
  console.error(`${errors.length} problem${errors.length === 1 ? "" : "s"} in the built pages:\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log(`${files.length} pages checked: titles, descriptions, share tags, structured data, headings, links, sitemap and llms.txt.`);
