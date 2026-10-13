/// <reference types="vite/client" />
// The website: a home page listing every converter, and a page per converter at its own address
// (pages.ts). Following a link between them doesn't reload the page: it's pushed onto history, so
// Back and Forward work as usual. Each converter is drawn by packages/ui/src/converter.ts.

import type { Region } from "@uom/core/region";
import { TOOLS } from "@uom/converters";
import { parseNumber, setNumberStyle } from "@uom/converters/format";
import { dyn, type Converter, type Topic, type Values } from "@uom/converters/model";
import { guessRegion, regionInfo, REGIONS } from "@uom/converters/regions";
import { AUDIENCES, type Audience } from "@uom/ui/audiences";
import { el, renderConverter } from "@uom/ui/converter";
import { icon } from "@uom/ui/icons";
import { HOME, idFromPath, PAGES, topicFromPath, TOPIC_PAGES } from "./pages";
import { registerOffline, STORE_URL } from "./site";

// The Windows app's own Store screenshots, light and dark (apps/windows/scripts/render.cjs).
// Imported, not new URL(…, import.meta.url): that would make addresses on the build machine when
// vite.config.ts runs this script to write each page's HTML.
import APP_LIGHT from "../../windows/store/listing/screenshot-3-voltage-drop.png";
import APP_DARK from "../../windows/store/listing/screenshot-8-conduit-dark.png";

// The site's base path, from SITE_URL in vite.config.ts.
declare const __SITE_BASE__: string;
const BASE = __SITE_BASE__;
const NAME = "UOM Converter";
/** The converter that runs on the home page: one field, and a diagram for an answer. */
const DEMO = "awg";

const byId = new Map(TOOLS.map((t) => [t.id, t]));
const EVERYTHING: Audience = {
  id: "all",
  label: "Everything",
  description: "Every converter, grouped by topic.",
  tools: TOOLS.map((t) => t.id),
};
const ALL_AUDIENCES = [EVERYTHING, ...AUDIENCES];
/** Topics in the order of their first converter. */
const TOPICS = [...new Set(TOOLS.map((t) => t.topic))];
const topicAnchor = (t: Topic) => t.toLowerCase().replace(/[^a-z]+/g, "-");
const pathFor = (id: string) => BASE + PAGES[id].slug;
const topicPath = (t: Topic) => BASE + TOPIC_PAGES[t].slug;

const main = document.querySelector<HTMLElement>("#main")!;

// ---------- Photos ----------

// As scripts/images.mjs writes them: "<slot>-<width>.webp", each slot at a few widths.
const PHOTO_FILES = import.meta.glob<string>("./images/*.webp", { eager: true, query: "?url", import: "default" });
const PHOTOS = new Map<string, { width: number; url: string }[]>();
for (const [path, url] of Object.entries(PHOTO_FILES)) {
  const base = path.slice(path.lastIndexOf("/") + 1, -".webp".length);
  const dash = base.lastIndexOf("-");
  const slot = base.slice(0, dash);
  PHOTOS.set(slot, [...(PHOTOS.get(slot) ?? []), { width: Number(base.slice(dash + 1)), url }].sort((a, b) => a.width - b.width));
}

/**
 * A photo slot as an <img> with every width it comes in, so the browser loads the one it needs
 * for `sizes` (how wide it's shown). `alt` is empty when the photo only decorates. Undefined
 * when the slot has no photo yet: the page goes without.
 */
function photo(slot: string, sizes: string, alt: string, cls?: string): HTMLImageElement | undefined {
  const files = PHOTOS.get(slot);
  if (!files) return undefined;
  const img = el("img", cls);
  img.src = files.at(-1)!.url;
  img.srcset = files.map((f) => `${f.url} ${f.width}w`).join(", ");
  img.sizes = sizes;
  img.alt = alt;
  img.decoding = "async";
  return img;
}

function stored(key: string): string | undefined {
  try {
    return localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}
function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the choice still applies for this visit via the URL.
  }
}

const params = new URLSearchParams(location.search);
let audience = ALL_AUDIENCES.find((a) => a.id === (params.get("for") ?? stored("uom.audience"))) ?? EVERYTHING;
let region: Region = REGIONS.find((r) => r.id === (params.get("region") ?? stored("uom.region")))?.id ?? guessRegion();

/** Descriptions only read the region. */
const blurb = (t: Converter) => dyn(t.blurb, { region } as Values);

// ---------- Addresses ----------

type Route = { kind: "home" } | { kind: "converter"; id: string } | { kind: "topic"; topic: Topic } | { kind: "missing" };

function route(): Route {
  const path = location.pathname;
  if (path === BASE || path === `${BASE}index.html`) return { kind: "home" };
  const id = idFromPath(path, BASE);
  if (id && byId.has(id)) return { kind: "converter", id };
  const topic = topicFromPath(path, BASE);
  return topic ? { kind: "topic", topic } : { kind: "missing" };
}

/** An address one of the site's pages is drawn for, so following a link to it needs no reload. */
const isPage = (path: string) => path === BASE || !!idFromPath(path, BASE) || !!topicFromPath(path, BASE);

/** The settings ride along in the address, so a shared link opens the same way. */
function syncUrl() {
  const p = new URLSearchParams();
  if (audience !== EVERYTHING) p.set("for", audience.id);
  p.set("region", region);
  history.replaceState(null, "", `${location.pathname}?${p}${location.hash}`);
}

/** Follow a link to one of the site's pages without reloading. */
function go(path: string, hash = "") {
  history.pushState(null, "", path + location.search + hash);
  render();
}

/** The page's own head, as a fresh load of this address has it (vite.config.ts writes those). */
function setHead(title: string, canonical?: string) {
  document.title = `${title} | ${NAME}`;
  const link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (link && canonical) link.href = new URL(canonical, link.href).href;
}

// ---------- Shared pieces ----------

function link(href: string, text: string, cls?: string) {
  const a = el("a", cls, text);
  a.href = href;
  return a;
}

/** A converter's tile: its name and what it works out. */
function tile(t: Converter) {
  const a = el("a", "tile");
  a.href = pathFor(t.id);
  a.append(el("span", "tile-title", t.title), el("span", "tile-text", blurb(t)));
  return a;
}

function tiles(tools: Converter[]) {
  const list = el("ul", "tiles");
  for (const t of tools) {
    const li = el("li");
    li.append(tile(t));
    list.append(li);
  }
  return list;
}

/** A topic's name with its icon, linked to the topic's page unless `current` (it's this page). */
function topicHeading(tag: "h2" | "h3", topic: Topic, current = false) {
  const h = el(tag, "topic-title");
  const i = icon(topic);
  if (i) h.append(i);
  if (current) h.append(topic);
  else h.append(link(topicPath(topic), topic));
  return h;
}

/** The audience's converters on a topic, in the audience's order. */
const toolsFor = (topic: Topic) => audience.tools.map((id) => byId.get(id)!).filter((t) => t.topic === topic);
const shownTopics = () => TOPICS.filter((topic) => toolsFor(topic).length);

// Built once per region, so a converter keeps what was typed while you look at others.
let panels = new Map<string, HTMLElement>();
function panel(id: string, heading: "h1" | "h2") {
  const key = `${id}:${heading}`;
  if (!panels.has(key)) panels.set(key, renderConverter(byId.get(id)!, region, heading));
  return panels.get(key)!;
}

/** Redraws the parts of the current page that list converters, when the audience changes. */
let refreshLists = () => {};

// ---------- Home ----------

function homeView(missing: boolean): Node[] {
  const hero = el("section", "hero wrap");
  const copy = el("div", "hero-copy");
  if (missing) {
    copy.append(
      el("h1", undefined, "Page not found"),
      el("p", "lede", "There's no converter at this address. Search for one above, or pick one from the list below."),
    );
  } else {
    copy.append(
      el("h1", undefined, "Unit conversions for the electrical trade"),
      el("p", "lede", "Price units, wire sizes, voltage drop and product codes. Free in your browser, for the US, Canada and Europe."),
    );
  }
  const actions = el("div", "actions");
  actions.append(link("#converters", "Browse converters", "button primary"));
  // What the site is, in facts: how much, which codes, and what it asks of you (nothing).
  const facts = el("ul", "facts");
  facts.setAttribute("aria-label", "About these converters");
  for (const [n, text] of [
    [String(TOOLS.length), "converters"],
    [String(REGIONS.length), `regions: ${REGIONS.map((r) => r.label).join(", ")}`],
    ["Works", "offline"],
    ["No", "account, no tracking"],
  ]) {
    const li = el("li");
    li.append(el("strong", undefined, n), ` ${text}`);
    facts.append(li);
  }
  copy.append(actions, facts);

  const demo = el("div", "demo");
  demo.append(panel(DEMO, "h2"), link(pathFor(DEMO), "Open the full converter", "demo-link"));
  hero.append(copy, demo);
  // Behind the opening, faded into the page on the left (style.css). The first thing on the page,
  // so it's fetched first rather than when it scrolls into view.
  const backdrop = photo("hero", "100vw", "", "hero-photo");
  if (backdrop && !missing) {
    backdrop.setAttribute("fetchpriority", "high");
    hero.prepend(backdrop);
  }

  const dir = el("section", "directory wrap");
  dir.id = "converters";
  dir.setAttribute("aria-labelledby", "dir-h");
  const head = el("div", "directory-head");
  const h = el("h2", undefined, "All converters");
  h.id = "dir-h";
  const roles = el("div", "roles");
  roles.setAttribute("role", "group");
  roles.setAttribute("aria-label", "Show converters for");
  const desc = el("p", "roles-desc");
  head.append(h, roles, desc);
  const topics = el("div", "topics");
  dir.append(head, topics);

  refreshLists = () => {
    roles.replaceChildren(
      ...ALL_AUDIENCES.map((a) => {
        const b = el("button", "chip");
        b.type = "button";
        const i = icon(a.id);
        if (i) b.append(i);
        b.append(a.label);
        b.setAttribute("aria-pressed", String(a === audience));
        b.addEventListener("click", () => setAudience(a));
        return b;
      }),
    );
    desc.textContent = audience.description;
    topics.replaceChildren(
      ...shownTopics().map((topic) => {
        const s = el("section", "topic");
        s.id = topicAnchor(topic);
        // The topic's heading, and under it the topic's photo, linked to its page as the heading is.
        const head = el("div", "topic-head");
        head.append(topicHeading("h3", topic));
        const thumb = photo(`${TOPIC_PAGES[topic].slug}-thumb`, "14rem", "");
        if (thumb) {
          thumb.loading = "lazy";
          const a = link(topicPath(topic), "", "topic-thumb");
          // The heading is the link to follow; this one is a second way to the same page.
          a.tabIndex = -1;
          a.setAttribute("aria-hidden", "true");
          a.append(thumb);
          head.append(a);
        }
        s.append(head, tiles(toolsFor(topic)));
        return s;
      }),
    );
  };
  refreshLists();

  return [hero, dir, windowsApp()];
}

function windowsApp() {
  const s = el("section", "app-promo wrap");
  s.setAttribute("aria-labelledby", "app-h");
  const copy = el("div", "app-copy");
  const h = el("h2", undefined, "Also on Windows");
  h.id = "app-h";
  const get = link(STORE_URL, "Get the Windows app", "button primary");
  get.rel = "noopener";
  copy.append(h, el("p", undefined, "The same converters in their own window, working offline. Free from the Microsoft Store."), get);
  const pic = el("picture");
  const dark = el("source");
  dark.media = "(prefers-color-scheme: dark)";
  dark.srcset = APP_DARK;
  const img = el("img");
  Object.assign(img, { src: APP_LIGHT, alt: "The UOM Converter Windows app", width: 2732, height: 1536, loading: "lazy", decoding: "async" });
  pic.append(dark, img);
  const frame = el("div", "app-shot");
  frame.append(pic);
  s.append(copy, frame);
  return s;
}

// ---------- A converter's page ----------

/** The converters by topic, for the audience picked in it; `current` is the page being shown. */
function sidebar(current: { id?: string; topic?: Topic }) {
  const side = el("aside", "side");
  side.setAttribute("aria-label", "Converters");
  const pick = el("label", "side-role");
  const select = el("select");
  for (const a of ALL_AUDIENCES) select.append(Object.assign(el("option", undefined, a.label), { value: a.id }));
  select.addEventListener("change", () => setAudience(ALL_AUDIENCES.find((a) => a.id === select.value)!));
  pick.append(el("span", undefined, "Show converters for"), select);
  const nav = el("nav");
  side.append(pick, nav);
  refreshLists = () => {
    select.value = audience.id;
    nav.replaceChildren(
      ...shownTopics().map((topic) => {
        const g = el("div", "side-group");
        g.append(topicHeading("h2", topic, topic === current.topic));
        for (const t of toolsFor(topic)) {
          const a = link(pathFor(t.id), t.title);
          if (t.id === current.id) a.setAttribute("aria-current", "page");
          g.append(a);
        }
        return g;
      }),
    );
  };
  refreshLists();
  return side;
}

/** The trail from the home page to the page shown, which isn't in it: its <h1> follows. */
function crumbs(trail: HTMLAnchorElement[]) {
  const nav = el("nav", "crumbs");
  nav.setAttribute("aria-label", "Breadcrumb");
  const ol = el("ol");
  for (const a of trail) {
    const li = el("li");
    li.append(a);
    ol.append(li);
  }
  nav.append(ol);
  return nav;
}

/**
 * The band across the top of a topic's pages: its photo under the brand colour, the breadcrumb,
 * and a title, white on it. `title` is the topic page's <h1>, or on a converter's page the
 * topic's name (the converter's own <h1> follows the band).
 */
function categoryBand(topic: Topic, trail: HTMLAnchorElement[], title: HTMLElement, alt = ""): HTMLElement {
  const band = el("section", "category-band");
  const img = photo(`${TOPIC_PAGES[topic].slug}-banner`, "100vw", alt, "category-photo");
  if (img) {
    img.setAttribute("fetchpriority", "high");
    band.append(img);
  }
  const inner = el("div", "wrap category-inner");
  inner.append(crumbs(trail), title);
  band.append(inner);
  return band;
}

function converterView(id: string): Node[] {
  const conv = byId.get(id)!;
  const layout = el("div", "doc-layout wrap");
  const side = sidebar({ id });
  const title = el("p", "category-title");
  title.append(link(topicPath(conv.topic), TOPIC_PAGES[conv.topic].heading));
  const band = categoryBand(conv.topic, [link(BASE, "Converters"), link(topicPath(conv.topic), conv.topic)], title);

  const article = el("article", "doc");
  article.append(panel(id, "h1"));
  const worked = workedExamples(conv);
  if (worked) article.append(worked);

  const others = TOOLS.filter((t) => t.topic === conv.topic && t.id !== id);
  if (others.length) {
    const related = el("section", "related");
    related.setAttribute("aria-labelledby", "related-h");
    const rh = el("h2", undefined, `More in ${conv.topic}`);
    rh.id = "related-h";
    related.append(rh, tiles(others));
    article.append(related);
  }
  layout.append(side, article);
  return [band, layout];
}

/** A converter's inputs as an example sets them, the rest at their defaults: no form needed. */
class ExampleValues implements Values {
  constructor(
    private conv: Converter,
    private set: Record<string, string>,
    readonly region: Region,
  ) {}

  str(id: string): string {
    if (id in this.set) return this.set[id];
    const f = this.conv.fields.find((x) => x.id === id)!;
    if (f.value !== undefined) return dyn(f.value, this).trim();
    return f.kind === "choice" ? f.options[0].value : "";
  }

  num(id: string): number | undefined {
    const f = this.conv.fields.find((x) => x.id === id)!;
    return parseNumber(this.str(id), f.kind !== "choice" && f.signed);
  }
}

/** A converter's answers to its examples, in the current region; examples it can't answer are left out. */
function examplesWorkedOut(conv: Converter) {
  return dyn(conv.examples, { region } as Values).flatMap((ex) => {
    const out = conv.compute(new ExampleValues(conv, ex.set, region));
    return out && "rows" in out && out.rows.length ? [out] : [];
  });
}

/**
 * Every example worked out, as text: what the converter gives for each, without clicking through
 * them. The page reads as an answer to "12 AWG in mm²" on its own, for people and search engines.
 */
function workedExamples(conv: Converter): HTMLElement | undefined {
  const items = examplesWorkedOut(conv).map((out) => {
    const item = el("div", "worked-item");
    const list = el("ul");
    // The answer and the details that come with it, up to the first few.
    for (const r of out.rows.slice(0, 5)) list.append(el("li", undefined, `${r.label}: ${r.value}`));
    item.append(el("h3", undefined, out.heading), list);
    return item;
  });
  if (!items.length) return undefined;
  const s = el("section", "worked");
  s.setAttribute("aria-labelledby", "worked-h");
  const h = el("h2", undefined, "Worked examples");
  h.id = "worked-h";
  s.append(h, ...items);
  return s;
}

// ---------- A topic's page ----------

/**
 * Every converter on a topic, whatever the audience: an introduction, the converters, a worked
 * answer from each, and the other topics. The hub a search for "electrical calculators" lands on.
 */
function topicView(topic: Topic): Node[] {
  const page = TOPIC_PAGES[topic];
  const convs = TOOLS.filter((t) => t.topic === topic);
  const layout = el("div", "doc-layout wrap");
  const side = sidebar({ topic });

  const h1 = el("h1", "topic-h1");
  const i = icon(topic);
  if (i) h1.append(i);
  h1.append(page.heading);
  const band = categoryBand(topic, [link(BASE, "Converters")], h1, page.photo);

  const article = el("article", "doc topic-page");
  article.append(el("p", "lede", page.intro), tiles(convs));

  // One answer from each converter: the first example, as the converter works it out.
  const answers = el("section", "answers");
  answers.setAttribute("aria-labelledby", "answers-h");
  const ah = el("h2", undefined, "Quick answers");
  ah.id = "answers-h";
  const list = el("ul");
  for (const t of convs) {
    const out = examplesWorkedOut(t)[0];
    if (!out) continue;
    const [answer] = out.rows;
    const li = el("li");
    // "Weight: 50 lb → Kilograms: 22.68 kg", from the heading "50 lb equals".
    const question = out.heading.replace(/\s+(equals|is|gives)$/, "");
    // The colon keeps name and answer apart as text; the layout puts them in columns.
    li.append(link(pathFor(t.id), t.title), el("span", "sr", ": "), el("span", undefined, `${question} → ${answer.label}: ${answer.value}`));
    list.append(li);
  }
  answers.append(ah, list);
  if (list.childElementCount) article.append(answers);

  const others = el("section", "related");
  others.setAttribute("aria-labelledby", "others-h");
  const oh = el("h2", undefined, "Other topics");
  oh.id = "others-h";
  const ul = el("ul", "tiles");
  for (const t of TOPICS.filter((x) => x !== topic)) {
    const a = el("a", "tile");
    a.href = topicPath(t);
    const thumb = photo(`${TOPIC_PAGES[t].slug}-thumb`, "5rem", "", "tile-thumb");
    if (thumb) {
      thumb.loading = "lazy";
      a.classList.add("has-thumb");
      a.append(thumb);
    }
    a.append(el("span", "tile-title", TOPIC_PAGES[t].heading), el("span", "tile-text", TOPIC_PAGES[t].description));
    const li = el("li");
    li.append(a);
    ul.append(li);
  }
  others.append(oh, ul);
  article.append(others);

  layout.append(side, article);
  return [band, layout];
}

// ---------- Drawing the page for the address ----------

let drawnPath: string | undefined;

function render() {
  closeSearch();
  // Same page, new #anchor: just scroll there.
  if (location.pathname === drawnPath) return scrollToHash();
  drawnPath = location.pathname;
  const r = route();
  if (r.kind === "converter") {
    main.replaceChildren(...converterView(r.id));
    setHead(PAGES[r.id].title, pathFor(r.id));
  } else if (r.kind === "topic") {
    main.replaceChildren(...topicView(r.topic));
    setHead(TOPIC_PAGES[r.topic].title, topicPath(r.topic));
  } else if (r.kind === "home") {
    main.replaceChildren(...homeView(false));
    setHead(HOME.title, BASE);
  } else {
    main.replaceChildren(...homeView(true));
    setHead("Page not found");
  }
  if (location.hash) scrollToHash();
  else window.scrollTo(0, 0);
}

function scrollToHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  // A topic the chosen audience hides: show everything, so the link lands somewhere.
  if (!document.getElementById(id) && TOPICS.some((t) => topicAnchor(t) === id) && audience !== EVERYTHING) setAudience(EVERYTHING);
  document.getElementById(id)?.scrollIntoView();
}

function setAudience(a: Audience) {
  audience = a;
  store("uom.audience", a.id);
  syncUrl();
  refreshLists();
}

function setRegion(r: Region) {
  region = r;
  store("uom.region", r);
  setNumberStyle(regionInfo(r).number);
  panels = new Map();
  syncUrl();
  drawRegion();
  // Redraw the page in the new region's units, staying where you were on it.
  const y = window.scrollY;
  drawnPath = undefined;
  render();
  window.scrollTo(0, y);
}

const regionBar = document.querySelector<HTMLElement>("#region")!;
function drawRegion() {
  regionBar.replaceChildren(
    ...REGIONS.map((r) => {
      const b = el("button", undefined, r.label);
      b.type = "button";
      b.title = `${r.code}, ${r.hz} Hz`;
      b.setAttribute("aria-pressed", String(r.id === region));
      b.addEventListener("click", () => setRegion(r.id));
      return b;
    }),
  );
}

// ---------- Header search ----------

const q = document.querySelector<HTMLInputElement>("#q")!;
const results = document.querySelector<HTMLUListElement>("#q-results")!;
let matches: Converter[] = [];
let active = -1;

/** Converters matching the search: name matches before description matches, each in the audience's order. */
function search(query: string): Converter[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const has = (text: string) => words.every((w) => text.toLowerCase().includes(w));
  const byName = (t: Converter) => has(`${t.title} ${t.topic} ${t.id} ${PAGES[t.id].title}`);
  const rank = (t: Converter) =>
    (byName(t) ? 0 : 2 * TOOLS.length) + (audience.tools.includes(t.id) ? audience.tools.indexOf(t.id) : TOOLS.length + TOOLS.indexOf(t));
  return TOOLS.filter((t) => byName(t) || has(blurb(t))).sort((a, b) => rank(a) - rank(b));
}

function drawResults() {
  const query = q.value.trim();
  matches = query ? search(query).slice(0, 8) : [];
  results.replaceChildren(
    ...matches.map((t, i) => {
      const li = el("li", "result");
      li.id = `q-${t.id}`;
      li.setAttribute("role", "option");
      li.append(el("span", "result-title", t.title), el("span", "result-topic", t.topic));
      li.addEventListener("pointerdown", (e) => e.preventDefault()); // keep focus in the box
      li.addEventListener("click", () => choose(t.id));
      li.addEventListener("pointermove", () => mark(i));
      return li;
    }),
  );
  if (query && !matches.length) results.append(el("li", "result-empty", "No converter matches."));
  results.hidden = !query;
  q.setAttribute("aria-expanded", String(!!query));
  mark(matches.length ? 0 : -1);
}

function mark(i: number) {
  active = i;
  results.querySelectorAll("[role=option]").forEach((li, j) => li.setAttribute("aria-selected", String(j === i)));
  if (i >= 0) q.setAttribute("aria-activedescendant", `q-${matches[i].id}`);
  else q.removeAttribute("aria-activedescendant");
}

function closeSearch() {
  results.hidden = true;
  q.setAttribute("aria-expanded", "false");
  q.removeAttribute("aria-activedescendant");
}

function choose(id: string) {
  q.value = "";
  q.blur();
  go(pathFor(id));
  // Straight into the first field, ready to type.
  main.querySelector<HTMLElement>("input[data-field]")?.focus();
}

q.addEventListener("input", drawResults);
q.addEventListener("focus", () => q.value.trim() && drawResults());
q.addEventListener("blur", closeSearch);
q.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    if (!matches.length) return;
    e.preventDefault();
    mark((active + (e.key === "ArrowDown" ? 1 : matches.length - 1)) % matches.length);
  } else if (e.key === "Enter" && active >= 0) {
    e.preventDefault();
    choose(matches[active].id);
  } else if (e.key === "Escape") {
    e.preventDefault(); // otherwise the box clears itself without closing the list
    if (q.value) q.value = "";
    else q.blur();
    closeSearch();
  }
});

// "/" or Ctrl+K jumps to the search, as on most sites; Ctrl+F stays the browser's own find.
document.addEventListener("keydown", (e) => {
  const typing = (e.target as Element).closest("input, textarea, select, [contenteditable]");
  if ((e.key === "/" && !typing) || ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k")) {
    e.preventDefault();
    q.focus();
    q.select();
  }
});

// ---------- Links ----------

document.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as Element).closest<HTMLAnchorElement>("a[href]");
  if (!a || a.target || a.origin !== location.origin) return;
  if (!isPage(a.pathname)) return;
  e.preventDefault();
  if (a.pathname === location.pathname) {
    history.pushState(null, "", location.pathname + location.search + a.hash);
    if (a.hash) return scrollToHash();
    return window.scrollTo(0, 0);
  }
  go(a.pathname, a.hash);
  // As after a page load, the next Tab starts at the top of the new page.
  main.focus({ preventScroll: true });
});
window.addEventListener("popstate", render);

// ---------- Start ----------

document.querySelectorAll<HTMLAnchorElement>("a[data-home]").forEach((a) => (a.href = BASE));
document.querySelectorAll<HTMLAnchorElement>("#get-app, #footer-app").forEach((a) => (a.href = STORE_URL));
document.querySelector("#footer-year")!.textContent = String(new Date().getFullYear());
document.querySelector("#footer-topic-list")!.replaceChildren(
  ...TOPICS.map((t) => {
    const li = el("li");
    li.append(link(topicPath(t), t));
    return li;
  }),
);

// Old links to the site used #<id> for a converter and #<topic> for a topic: move them to the
// converter's or topic's own address.
const legacy = location.hash.slice(1);
const legacyTopic = TOPICS.find((t) => topicAnchor(t) === legacy);
if (route().kind === "home" && byId.has(legacy)) history.replaceState(null, "", pathFor(legacy) + location.search);
else if (route().kind === "home" && legacyTopic) history.replaceState(null, "", topicPath(legacyTopic) + location.search);

setNumberStyle(regionInfo(region).number);
drawRegion();
syncUrl();
render();
registerOffline(BASE);
