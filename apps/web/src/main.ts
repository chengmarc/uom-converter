/// <reference types="vite/client" />
// The website: a home page listing every converter, and a page per converter at its own address
// (pages.ts). Following a link between them doesn't reload the page: it's pushed onto history, so
// Back and Forward work as usual. Each converter is drawn by packages/ui/src/converter.ts.

import type { Region } from "@uom/core/region";
import { byId, TOOLS, TOPICS } from "@uom/converters";
import { blurb, dyn, exampleValues, type Converter, type Topic, type Values } from "@uom/converters/model";
import { REGIONS } from "@uom/converters/regions";
import { ALL_AUDIENCES, EVERYTHING, type Audience } from "@uom/ui/audiences";
import { chooseAudience, chooseRegion, chosenAudience, chosenRegion } from "@uom/ui/choices";
import { renderConverter } from "@uom/ui/converter";
import { el } from "@uom/ui/dom";
import { photoLibrary, TOPIC_SLOTS } from "@uom/ui/photos";
import { HOME, idFromPath, PAGES, PRIVACY, topicFromPath, TOPIC_PAGES } from "./pages";
import { PRIVACY_HTML } from "./privacy";
import { EXE_URL, NAME, registerOffline, STORE_URL } from "./site";

// The site's base path, from SITE_URL in scripts/site.ts.
declare const __SITE_BASE__: string;
const BASE = __SITE_BASE__;

const topicAnchor = (t: Topic) => t.toLowerCase().replace(/[^a-z]+/g, "-");
const pathFor = (id: string) => BASE + PAGES[id].slug;
const topicPath = (t: Topic) => BASE + TOPIC_PAGES[t].slug;

const main = document.querySelector<HTMLElement>("#main")!;

// ---------- Photos ----------

// Every size of every topic photo (@uom/ui/photos), for srcset to choose from; not the backdrop,
// which style.css puts beside the page.
const photo = photoLibrary(
  import.meta.glob<string>(["@uom/brand/photos/*.webp", "!**/backdrop-*.webp"], {
    eager: true,
    query: "?url",
    import: "default",
  }),
);

const params = new URLSearchParams(location.search);
let audience = chosenAudience(params);
let region: Region = chosenRegion(params);

// ---------- Addresses ----------

type Route = { kind: "home" } | { kind: "converter"; id: string } | { kind: "topic"; topic: Topic } | { kind: "privacy" } | { kind: "missing" };

const privacyPath = BASE + PRIVACY.slug;

function route(): Route {
  const path = location.pathname;
  if (path === BASE || path === `${BASE}index.html`) return { kind: "home" };
  if (path === privacyPath) return { kind: "privacy" };
  const id = idFromPath(path, BASE);
  if (id && byId.has(id)) return { kind: "converter", id };
  const topic = topicFromPath(path, BASE);
  return topic ? { kind: "topic", topic } : { kind: "missing" };
}

/** An address one of the site's pages is drawn for, so following a link to it needs no reload. */
const isPage = (path: string) => path === BASE || path === privacyPath || !!idFromPath(path, BASE) || !!topicFromPath(path, BASE);

/** The settings ride along in the address, so a shared link opens the same way. */
function syncUrl() {
  const p = new URLSearchParams();
  if (audience !== EVERYTHING) p.set("for", audience.id);
  p.set("region", region);
  history.replaceState(null, "", `${location.pathname}?${p}${location.hash}`);
}

/** The page's own head, as a fresh load of this address has it (scripts/head.ts writes those). */
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

/** A topic's square photo, small, for beside a link: decorative, so the link's text says it all. */
function thumbnail(topic: Topic, cls: string): HTMLImageElement | undefined {
  const img = photo(`${TOPIC_SLOTS[topic]}-thumb`, "5rem", "", cls);
  if (img) img.loading = "lazy";
  return img;
}

/** A tile linking to a page: its topic's photo, its name and what it's for. */
function tile(href: string, topic: Topic, title: string, text: string) {
  const a = el("a", "tile");
  a.href = href;
  const thumb = thumbnail(topic, "tile-thumb");
  if (thumb) {
    a.classList.add("has-thumb");
    a.append(thumb);
  }
  a.append(el("span", "tile-title", title), el("span", "tile-text", text));
  const li = el("li");
  li.append(a);
  return li;
}

/**
 * Converters' tiles. Every converter on a topic shows the same photo, as a supplier's catalogue
 * shows one picture for a product line.
 */
function tiles(tools: Converter[]) {
  const list = el("ul", "tiles");
  list.append(...tools.map((t) => tile(pathFor(t.id), t.topic, t.title, blurb(t, region))));
  return list;
}

/** A topic's name, linked to the topic's page unless `current` (it's this page). */
function topicHeading(tag: "h2" | "h3", topic: Topic, current = false) {
  const h = el(tag, "topic-title");
  if (current) h.append(topic);
  else h.append(link(topicPath(topic), topic));
  return h;
}

/** The audience's converters on a topic, in the audience's order. */
const toolsFor = (topic: Topic) => audience.tools.map((id) => byId.get(id)!).filter((t) => t.topic === topic);
const shownTopics = () => TOPICS.filter((topic) => toolsFor(topic).length);

// Built once per region, so a converter keeps what was typed while you look at others.
let panels = new Map<string, HTMLElement>();
function panel(id: string) {
  if (!panels.has(id)) panels.set(id, renderConverter(byId.get(id)!, region, "h1"));
  return panels.get(id)!;
}

/** Redraws the parts of the current page that list converters, when the audience changes. */
let refreshLists = () => {};

// ---------- Home ----------

/** The "Show converters for" choice, as a plain dropdown. `sync` sets it to the current audience. */
function audienceSelect() {
  const pick = el("label", "side-role");
  const select = el("select");
  for (const a of ALL_AUDIENCES) select.append(Object.assign(el("option", undefined, a.label), { value: a.id }));
  select.addEventListener("change", () => setAudience(ALL_AUDIENCES.find((a) => a.id === select.value)!));
  pick.append(el("span", undefined, "Show converters for"), select);
  return { pick, sync: () => (select.value = audience.id) };
}

/**
 * Across the top of the home page: a strip of the topics' photos, as a supplier's site opens on its
 * product lines. Decorative: the category bar above it is how you get to a topic.
 */
function categoryStrip(): HTMLElement {
  const strip = el("div", "category-strip");
  for (const t of TOPICS) {
    const img = photo(`${TOPIC_SLOTS[t]}-thumb`, "(max-width: 640px) 9rem, 15vw", "");
    if (img) {
      img.setAttribute("fetchpriority", "high");
      strip.append(img);
    }
  }
  return strip;
}

function homeView(missing: boolean): Node[] {
  const intro = el("section", "home-intro wrap");
  if (missing) {
    intro.append(
      el("h1", undefined, "Page not found"),
      el("p", undefined, "There's no converter at this address. Pick a category above, or a converter from the list below."),
    );
  } else {
    intro.append(
      crumbs([], "Converters"),
      el("h1", undefined, "Unit conversions for the electrical trade"),
      el(
        "p",
        undefined,
        `${TOOLS.length} converters for price units, wire sizes, voltage drop and product codes, for the US, Canada and Europe. ` +
          "Free to use in your browser, with no account, and they keep working offline once loaded.",
      ),
    );
  }

  const dir = el("section", "directory wrap");
  dir.id = "converters";
  dir.setAttribute("aria-labelledby", "dir-h");
  const head = el("div", "directory-head");
  const h = el("h2", undefined, "All converters");
  h.id = "dir-h";
  const picker = audienceSelect();
  head.append(h, picker.pick);
  const topics = el("div", "topics");
  dir.append(head, topics);

  refreshLists = () => {
    picker.sync();
    topics.replaceChildren(
      ...shownTopics().map((topic) => {
        const s = el("section", "topic");
        s.id = topicAnchor(topic);
        s.append(topicHeading("h3", topic), tiles(toolsFor(topic)));
        return s;
      }),
    );
  };
  refreshLists();

  dir.append(toTop());
  return [categoryStrip(), windowsApp(), intro, dir];
}

/** The Windows app, in a line: what it is and where to get it. */
function windowsApp() {
  const s = el("aside", "app-note wrap");
  s.setAttribute("aria-label", "Windows app");
  s.append(appBox());
  return s;
}

/**
 * The Windows app, as a card from a newer era than the page around it (.app-card in style.css):
 * its icon, what it is, a button to the Store with Microsoft's logo, and a lesser one for the
 * installer. Under the home page's photos, and at the top of the menu on every topic and converter
 * page, where it stacks.
 */
function appBox() {
  const card = el("div", "app-card");
  const inner = el("div", "app-card-inner");

  const icon = el("img", "app-card-icon");
  icon.src = `${import.meta.env.BASE_URL}app-icon.svg`;
  icon.alt = "";
  icon.width = icon.height = 64;

  const text = el("div", "app-card-text");
  text.append(
    el("p", "app-card-eyebrow", "Windows app · Free"),
    el("p", "app-card-title", "Every converter, in its own window"),
    el("p", "app-card-lede", "The same converters as this site, working offline."),
  );

  const get = link(STORE_URL, "Get it from the Microsoft Store", "app-card-cta");
  get.rel = "noopener";
  get.prepend(microsoftLogo());

  const exe = link(EXE_URL, "Download .exe", "app-card-cta app-card-cta-exe");
  exe.rel = "noopener";
  exe.prepend(downloadIcon());

  const actions = el("div", "app-card-actions");
  actions.append(get, exe);

  inner.append(icon, text, actions);
  card.append(inner);
  return card;
}

/** An arrow down to a line. */
function downloadIcon() {
  const ns = "http://www.w3.org/2000/svg";
  const icon = document.createElementNS(ns, "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", "M12 3v12m-5-5 5 5 5-5M4 20h16");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2.25");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  icon.append(path);
  return icon;
}

/** Microsoft's four squares, in their colours (as on the Store badge in docs/badges/). */
function microsoftLogo() {
  const ns = "http://www.w3.org/2000/svg";
  const logo = document.createElementNS(ns, "svg");
  logo.setAttribute("viewBox", "0 0 21 21");
  logo.setAttribute("aria-hidden", "true");
  for (const [x, y, fill] of [[0, 0, "#f25022"], [11, 0, "#7fba00"], [0, 11, "#00a4ef"], [11, 11, "#ffb900"]] as const) {
    const square = document.createElementNS(ns, "rect");
    square.setAttribute("x", String(x));
    square.setAttribute("y", String(y));
    square.setAttribute("width", "10");
    square.setAttribute("height", "10");
    square.setAttribute("fill", fill);
    logo.append(square);
  }
  return logo;
}

// ---------- A converter's page ----------

/** The converters by topic, for the audience picked in it; `current` is the page being shown. */
function sidebar(current: { id?: string; topic?: Topic }) {
  const side = el("aside", "side");
  side.setAttribute("aria-label", "Converters");
  const picker = audienceSelect();
  const nav = el("nav");
  side.append(appBox(), picker.pick, nav);
  refreshLists = () => {
    picker.sync();
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

/**
 * Where a page sits: Converters (the home page), then a topic, then a converter. The trail leading
 * to the page, then the page shown, by name: only the links ahead of it go anywhere.
 */
function crumbs(trail: HTMLAnchorElement[], current: string) {
  const nav = el("nav", "crumbs");
  nav.setAttribute("aria-label", "Breadcrumb");
  const ol = el("ol");
  for (const a of trail) {
    const li = el("li");
    li.append(a);
    ol.append(li);
  }
  const here = el("li", undefined, current);
  here.setAttribute("aria-current", "page");
  ol.append(here);
  nav.append(el("span", "crumbs-label", "You are here:"), ol);
  return nav;
}

/** "Back to top", at the end of a long page. */
function toTop() {
  const p = el("p", "to-top");
  p.append(link("#main", "Back to top ▲"));
  return p;
}

/** The band across the top of a topic's pages: its photo. */
function categoryBand(topic: Topic, alt = ""): HTMLElement {
  const band = el("div", "category-band");
  const img = photo(`${TOPIC_SLOTS[topic]}-banner`, "100vw", alt, "category-photo");
  if (img) {
    img.setAttribute("fetchpriority", "high");
    band.append(img);
  }
  return band;
}

function converterView(id: string): Node[] {
  const conv = byId.get(id)!;
  const layout = el("div", "doc-layout wrap");
  const side = sidebar({ id });
  const band = categoryBand(conv.topic);

  const article = el("article", "doc");
  article.append(crumbs([link(BASE, "Converters"), link(topicPath(conv.topic), conv.topic)], conv.title), panel(id));
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
  article.append(toTop());
  layout.append(side, article);
  return [band, layout];
}

/** A converter's answers to its examples, in the current region; examples it can't answer are left out. */
function examplesWorkedOut(conv: Converter) {
  return dyn(conv.examples, { region } as Values).flatMap((ex) => {
    const out = conv.compute(exampleValues(conv, ex.set, region));
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

  const band = categoryBand(topic, page.photo);

  const article = el("article", "doc topic-page");
  article.append(crumbs([link(BASE, "Converters")], topic), el("h1", "topic-h1", page.heading), el("p", "lede", page.intro), tiles(convs));

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
  ul.append(...TOPICS.filter((x) => x !== topic).map((t) => tile(topicPath(t), t, TOPIC_PAGES[t].heading, TOPIC_PAGES[t].description)));
  others.append(oh, ul);
  article.append(others);

  article.append(toTop());
  layout.append(side, article);
  return [band, layout];
}

function privacyView(): Node[] {
  const page = el("div", "wrap privacy");
  const policy = el("article");
  policy.innerHTML = PRIVACY_HTML;
  page.append(crumbs([link(BASE, "Converters")], "Privacy"), policy);
  return [page];
}

// ---------- Drawing the page for the address ----------

let drawnPath: string | undefined;

function render() {
  // Same page, new #anchor: just scroll there.
  if (location.pathname === drawnPath) return scrollToHash();
  drawnPath = location.pathname;
  const r = route();
  markCategory(r);
  if (r.kind === "converter") {
    main.replaceChildren(...converterView(r.id));
    setHead(PAGES[r.id].title, pathFor(r.id));
  } else if (r.kind === "topic") {
    main.replaceChildren(...topicView(r.topic));
    setHead(TOPIC_PAGES[r.topic].title, topicPath(r.topic));
  } else if (r.kind === "privacy") {
    main.replaceChildren(...privacyView());
    setHead(PRIVACY.title, privacyPath);
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
  chooseAudience(a);
  syncUrl();
  refreshLists();
}

function setRegion(r: Region) {
  region = r;
  chooseRegion(r);
  panels = new Map();
  syncUrl();
  drawRegion();
  // Redraw the page in the new region's units, staying where you were on it.
  const y = window.scrollY;
  drawnPath = undefined;
  render();
  window.scrollTo(0, y);
}

const regionSelect = document.querySelector<HTMLSelectElement>("#region")!;
regionSelect.addEventListener("change", () => setRegion(regionSelect.value as Region));
function drawRegion() {
  regionSelect.replaceChildren(
    ...REGIONS.map((r) => Object.assign(el("option", undefined, `${r.label} (${r.code}, ${r.hz} Hz)`), { value: r.id, selected: r.id === region })),
  );
}

// ---------- The category menu ----------

const categoryNav = document.querySelector<HTMLUListElement>("#category-nav")!;
categoryNav.replaceChildren(
  ...[{ href: BASE, text: "All converters" }, ...TOPICS.map((t) => ({ href: topicPath(t), text: t }))].map(({ href, text }) => {
    const li = el("li");
    li.append(link(href, text));
    return li;
  }),
);

/** Marks the menu entry for the page shown: its topic, or All converters on the home page. */
function markCategory(r: Route) {
  const topic = r.kind === "topic" ? r.topic : r.kind === "converter" ? byId.get(r.id)!.topic : undefined;
  const current = r.kind === "home" ? BASE : topic ? topicPath(topic) : undefined;
  categoryNav.querySelectorAll("a").forEach((a) => {
    if (a.getAttribute("href") === current) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

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
  history.pushState(null, "", a.pathname + location.search + a.hash);
  render();
  // As after a page load, the next Tab starts at the top of the new page.
  main.focus({ preventScroll: true });
});
window.addEventListener("popstate", render);

// ---------- Start ----------

document.querySelectorAll<HTMLAnchorElement>("a[data-home]").forEach((a) => (a.href = BASE));
document.querySelectorAll<HTMLAnchorElement>("a[data-privacy]").forEach((a) => (a.href = privacyPath));
document.querySelectorAll<HTMLAnchorElement>("#footer-app, #footer-android").forEach((a) => (a.href = STORE_URL));
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

drawRegion();
syncUrl();
render();
registerOffline(BASE);
