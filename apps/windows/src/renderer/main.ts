/// <reference types="vite/client" />
// Bundled with the app: the page may only load its own files (see the CSP in index.html).
// Weight and optical-size axes: headings and big result values get display-cut letterforms.
import "@fontsource-variable/inter/opsz.css";
import type { Region } from "@uom/core/region";
import { ALL_AUDIENCES, EVERYTHING, type Audience } from "@uom/ui/audiences";
import { byId, TOOLS } from "@uom/converters";
import { icon, settingsIcon } from "@uom/ui/icons";
import { REGIONS } from "@uom/converters/regions";
import type { Converter, Topic } from "@uom/converters/model";
import { LANGUAGES, t, type Language } from "@uom/i18n";
import { renderConverter } from "@uom/ui/converter";
import { el } from "@uom/ui/dom";
import { photoLibrary, TOPIC_SLOTS } from "@uom/ui/photos";
import { search } from "@uom/ui/search";
import { chooseAudience, chooseRegion, chosenAudience, chosenRegion } from "@uom/ui/choices";
import { chooseLanguage, chosenLanguage } from "@uom/ui/language";

// ---------- Page ----------

// In the desktop app Electron draws the window buttons over the page (Window Controls Overlay);
// style.css then turns the header into the title bar.
const overlay = (navigator as Navigator & { windowControlsOverlay?: { visible: boolean } }).windowControlsOverlay;
if (overlay?.visible) document.documentElement.classList.add("desktop");

// The native menus are in the same language; a browser (npm run windows:dev without Electron) has none.
const shell = (window as Window & { uomApp?: { setLanguage(language: Language): void } }).uomApp;
const params = new URLSearchParams(location.search);
let language = chosenLanguage(params);
shell?.setLanguage(language);

const content = document.querySelector<HTMLElement>("#content")!;
const sidebar = document.querySelector<HTMLElement>("#sidebar")!;
const picker = document.querySelector<HTMLSelectElement>("#picker")!;
const audienceBar = document.querySelector<HTMLElement>("#audience")!;
const regionBar = document.querySelector<HTMLElement>("#region")!;
const languageSelect = document.querySelector<HTMLSelectElement>("#language")!;
const settings = document.querySelector<HTMLDialogElement>("#settings")!;
const audienceDesc = document.querySelector<HTMLElement>("#audience-desc")!;

let audience = chosenAudience(params);
// A converter's own page always opens on that converter, whatever the audience last chosen.
const landing = routeId();
if (landing && !audience.tools.includes(landing)) audience = EVERYTHING;
let region: Region = chosenRegion(params);

function chip(label: string, pressed: boolean, onClick: () => void, opts: { title?: string; icon?: string; detail?: string } = {}) {
  const b = Object.assign(document.createElement("button"), { type: "button" });
  const i = opts.icon ? icon(opts.icon) : undefined;
  if (i) b.append(i);
  b.append(label);
  if (opts.detail) b.append(el("small", undefined, opts.detail));
  b.setAttribute("aria-pressed", String(pressed));
  if (opts.title) b.title = opts.title;
  b.addEventListener("click", onClick);
  return b;
}

function buildControls() {
  audienceBar.replaceChildren(...ALL_AUDIENCES.map((a) => chip(t(a.label), a === audience, () => setAudience(a), { title: t(a.description), icon: a.id })));
  audienceDesc.textContent = t(audience.description);
  regionBar.replaceChildren(...REGIONS.map((r) => chip(t(r.label), r.id === region, () => setRegion(r.id), { detail: `${r.code} · ${r.hz} Hz` })));
  languageSelect.replaceChildren(...LANGUAGES.map((l) => Object.assign(document.createElement("option"), { value: l.id, textContent: l.name, selected: l.id === language })));
}

function navLink(id: string, text: string) {
  const a = Object.assign(document.createElement("a"), { href: `#${id}`, textContent: t(text) });
  a.dataset.id = id;
  return a;
}

const find = document.querySelector<HTMLInputElement>("#find")!;

function navGroup(title: string, tools: Converter[], topicIcon?: string) {
  const section = el("div", "nav-group");
  const h = el("h2");
  const i = topicIcon ? icon(topicIcon) : undefined;
  if (i) h.append(i);
  h.append(title);
  section.append(h, ...tools.map((c) => navLink(c.id, c.title)));
  return section;
}

/** The audience's converters by topic; while searching, the matches instead, the audience's own first. */
function buildNav() {
  const query = find.value.trim();
  if (query) {
    const found = search(query, audience, region);
    const mine = found.filter((c) => audience.tools.includes(c.id));
    const others = found.filter((c) => !audience.tools.includes(c.id));
    sidebar.replaceChildren();
    if (mine.length) sidebar.append(navGroup(audience === EVERYTHING ? t("Matches") : t("For {audience}", { audience: t(audience.label) }), mine));
    if (others.length) sidebar.append(navGroup(t("In Everything"), others));
    if (!found.length) sidebar.append(el("p", "sidebar-hint", t("No converter matches.")));
  } else {
    const visible = audience.tools.map((id) => byId.get(id)!);
    // Groups in order of their first tool, tools in the audience's priority order.
    const groups = [...new Set(visible.map((c) => c.topic))];
    sidebar.replaceChildren(...groups.map((g) => navGroup(t(g), visible.filter((c) => c.topic === g), g)));
    sidebar.append(el("p", "sidebar-hint", t("Click any result to copy it.")));
  }
  markCurrent();

  // The narrow-window picker always lists the audience's converters.
  picker.replaceChildren();
  for (const g of [...new Set(audience.tools.map((id) => byId.get(id)!.topic))]) {
    const og = Object.assign(document.createElement("optgroup"), { label: t(g) });
    for (const id of audience.tools.filter((id) => byId.get(id)!.topic === g)) {
      og.append(Object.assign(document.createElement("option"), { value: id, textContent: t(byId.get(id)!.title) }));
    }
    picker.append(og);
  }
  picker.value = currentId();
}

function markCurrent() {
  const id = currentId();
  sidebar.querySelectorAll("a").forEach((a) => {
    if (a.dataset.id === id) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

let panels = new Map<string, HTMLElement>();
function buildPanels() {
  panels = new Map(TOOLS.map((c) => [c.id, renderConverter(c, region)]));
  content.replaceChildren(...panels.values());
}

// Each topic's banner (@uom/ui/photos), at every size: the window can be any width, and the
// app's size doesn't matter much.
const photo = photoLibrary(
  import.meta.glob<string>("@uom/brand/photos/*-banner-*.webp", { eager: true, query: "?url", import: "default" }),
);
const backdrop = document.querySelector<HTMLElement>("#backdrop")!;
let backdropTopic: Topic | undefined;

/** The converter pane's background: the shown converter's topic photo, faint, at its foot (style.css .backdrop). */
function showBackdrop(topic: Topic) {
  if (topic === backdropTopic) return;
  backdropTopic = topic;
  const img = photo(`${TOPIC_SLOTS[topic]}-banner`, "100vw", "");
  backdrop.replaceChildren(...(img ? [img] : []));
}

/** The converter the address asks for, if any. */
function routeId(): string | undefined {
  const id = location.hash.slice(1);
  return id && byId.has(id) ? id : undefined;
}

const currentId = () => {
  const id = routeId();
  // Each audience opens on the converter it uses most.
  return id && audience.tools.includes(id) ? id : audience.tools[0];
};

function syncUrl() {
  const p = new URLSearchParams();
  if (audience !== EVERYTHING) p.set("for", audience.id);
  p.set("region", region);
  history.replaceState(null, "", `?${p}#${currentId()}`);
}

function navigate(id: string) {
  location.hash = id;
}

function setAudience(a: Audience) {
  audience = a;
  chooseAudience(a);
  syncUrl();
  buildControls();
  buildNav();
  show(false);
}

function setRegion(r: Region) {
  region = r;
  chooseRegion(r);
  syncUrl();
  buildControls();
  buildPanels();
  show(false);
  // The button just clicked was redrawn: stay on the region's, in the open dialog.
  regionBar.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus();
}

function setLanguage(l: Language) {
  language = l;
  chooseLanguage(l);
  shell?.setLanguage(l);
  buildControls();
  buildNav();
  buildPanels();
  show(false);
}

let shown: string | undefined;
function show(focus: boolean) {
  const id = currentId();
  for (const [pid, panel] of panels) panel.hidden = pid !== id;
  // The converter pane scrolls on its own, so a new converter starts at its top.
  if (id !== shown) content.scrollTop = 0;
  shown = id;
  showBackdrop(byId.get(id)!.topic);
  markCurrent();
  picker.value = id;
  if (focus) panels.get(id)!.querySelector<HTMLElement>("input[data-field]")?.focus();
}

/** Open a converter, switching to Everything if the current audience doesn't list it. */
function open(id: string) {
  if (!audience.tools.includes(id)) setAudience(EVERYTHING);
  if (routeId() === id) show(true);
  else navigate(id);
}

// ---------- Sidebar: search and keyboard ----------

/** Opening a match ends the search, so the sidebar goes back to the audience's list. */
function choose(id: string) {
  if (find.value) {
    find.value = "";
    buildNav();
  }
  open(id);
}

sidebar.addEventListener("click", (e) => {
  const link = (e.target as Element).closest<HTMLAnchorElement>("a[data-id]");
  if (!link) return;
  e.preventDefault();
  choose(link.dataset.id!);
});

// Up and down arrows move through the sidebar like a list, keeping focus there; up from the top
// goes back to the search box.
sidebar.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  const links = Array.from(sidebar.querySelectorAll<HTMLAnchorElement>("a[data-id]"));
  const at = links.indexOf(e.target as HTMLAnchorElement);
  const next = links[at + (e.key === "ArrowDown" ? 1 : -1)];
  if (!next && !(e.key === "ArrowUp" && at === 0)) return;
  e.preventDefault();
  if (!next) return find.focus();
  next.focus();
  // Preview the audience's own converters as focus moves; a match from Everything opens on Enter.
  if (audience.tools.includes(next.dataset.id!)) {
    history.replaceState(null, "", `#${next.dataset.id}`);
    show(false);
  }
});

find.addEventListener("input", buildNav);
find.addEventListener("keydown", (e) => {
  const first = sidebar.querySelector<HTMLAnchorElement>("a[data-id]");
  if (e.key === "Enter" && find.value.trim() && first) {
    e.preventDefault();
    choose(first.dataset.id!);
  } else if (e.key === "ArrowDown" && first) {
    e.preventDefault();
    first.focus();
  } else if (e.key === "Escape" && find.value) {
    e.preventDefault(); // otherwise the search box clears itself without rebuilding the list
    find.value = "";
    buildNav();
  }
});
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "f") {
    e.preventDefault();
    find.focus();
    find.select();
  }
});

picker.addEventListener("change", () => navigate(picker.value));
languageSelect.addEventListener("change", () => setLanguage(languageSelect.value as Language));

// ---------- Settings ----------

const openSettings = document.querySelector<HTMLElement>("#open-settings")!;
openSettings.prepend(settingsIcon());
openSettings.addEventListener("click", () => settings.showModal());
document.querySelector("#close-settings")!.addEventListener("click", () => settings.close());
// A click on the dimmed area outside the dialog closes it.
settings.addEventListener("click", (e) => {
  if (e.target === settings) settings.close();
});

window.addEventListener("hashchange", () => show(true));
buildControls();
buildNav();
buildPanels();
syncUrl();
show(false);
