// Bundled with the app: the page may only load its own files (see the CSP in index.html).
// Weight and optical-size axes: headings and big result values get display-cut letterforms.
import "@fontsource-variable/inter/opsz.css";
import type { Region } from "../core/region";
import { AUDIENCES, type Audience } from "./audiences";
import { TOOLS } from "./converters";
import { icon } from "./icons";
import { guessRegion, regionInfo, REGIONS } from "./regions";
import { setNumberStyle } from "./format";
import { dyn, el, renderConverter, type Converter, type Values } from "./ui";

// audiences.test.ts checks every id an audience lists exists.
const byId = new Map(TOOLS.map((t) => [t.id, t]));

const EVERYTHING: Audience = {
  id: "all",
  label: "Everything",
  description: "Every converter, grouped by topic.",
  tools: TOOLS.map((t) => t.id),
};


// ---------- Page ----------

// In the desktop app Electron draws the window buttons over the page (Window Controls Overlay);
// style.css then turns the header into the title bar.
const overlay = (navigator as Navigator & { windowControlsOverlay?: { visible: boolean } }).windowControlsOverlay;
if (overlay?.visible) document.documentElement.classList.add("desktop");

const content = document.querySelector<HTMLElement>("#content")!;
const sidebar = document.querySelector<HTMLElement>("#sidebar")!;
const picker = document.querySelector<HTMLSelectElement>("#picker")!;
const audienceBar = document.querySelector<HTMLElement>("#audience")!;
const regionBar = document.querySelector<HTMLElement>("#region")!;
const audienceDesc = document.querySelector<HTMLElement>("#audience-desc")!;

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
const ALL_AUDIENCES = [EVERYTHING, ...AUDIENCES];
let audience = ALL_AUDIENCES.find((a) => a.id === (params.get("for") ?? stored("uom.audience"))) ?? EVERYTHING;
let region: Region = REGIONS.find((r) => r.id === (params.get("region") ?? stored("uom.region")))?.id ?? guessRegion();

function chip(label: string, pressed: boolean, onClick: () => void, opts: { title?: string; icon?: string } = {}) {
  const b = Object.assign(document.createElement("button"), { type: "button" });
  const i = opts.icon ? icon(opts.icon) : undefined;
  if (i) b.append(i);
  b.append(label);
  b.setAttribute("aria-pressed", String(pressed));
  if (opts.title) b.title = opts.title;
  b.addEventListener("click", onClick);
  return b;
}

function buildControls() {
  audienceBar.replaceChildren(...ALL_AUDIENCES.map((a) => chip(a.label, a === audience, () => setAudience(a), { title: a.description, icon: a.id })));
  audienceDesc.textContent = audience.description;
  regionBar.replaceChildren(...REGIONS.map((r) => chip(r.label, r.id === region, () => setRegion(r.id), { title: `${r.code} · ${r.hz} Hz` })));
}

function navLink(id: string, text: string) {
  const a = Object.assign(document.createElement("a"), { href: `#${id}`, textContent: text });
  a.dataset.id = id;
  return a;
}

const find = document.querySelector<HTMLInputElement>("#find")!;

/** Converters matching the search: name matches before description matches, each in the audience's order. */
function search(query: string): Converter[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const has = (text: string) => words.every((w) => text.toLowerCase().includes(w));
  const byName = (t: Converter) => has(`${t.title} ${t.topic} ${t.id}`);
  const blurb = (t: Converter) => dyn(t.blurb, { region } as Values); // descriptions only read the region
  const rank = (t: Converter) =>
    (byName(t) ? 0 : 2 * TOOLS.length) + (audience.tools.includes(t.id) ? audience.tools.indexOf(t.id) : TOOLS.length + TOOLS.indexOf(t));
  return TOOLS.filter((t) => byName(t) || has(blurb(t))).sort((a, b) => rank(a) - rank(b));
}

function navGroup(title: string, tools: Converter[], topicIcon?: string) {
  const section = el("div", "nav-group");
  const h = el("h2");
  const i = topicIcon ? icon(topicIcon) : undefined;
  if (i) h.append(i);
  h.append(title);
  section.append(h, ...tools.map((t) => navLink(t.id, t.title)));
  return section;
}

/** The audience's converters by topic; while searching, the matches instead, the audience's own first. */
function buildNav() {
  const query = find.value.trim();
  if (query) {
    const found = search(query);
    const mine = found.filter((t) => audience.tools.includes(t.id));
    const others = found.filter((t) => !audience.tools.includes(t.id));
    sidebar.replaceChildren();
    if (mine.length) sidebar.append(navGroup(audience === EVERYTHING ? "Matches" : `For ${audience.label}`, mine));
    if (others.length) sidebar.append(navGroup("In Everything", others));
    if (!found.length) sidebar.append(el("p", "sidebar-hint", "No converter matches."));
  } else {
    const visible = audience.tools.map((id) => byId.get(id)!);
    // Groups in order of their first tool, tools in the audience's priority order.
    const groups = [...new Set(visible.map((t) => t.topic))];
    sidebar.replaceChildren(...groups.map((g) => navGroup(g, visible.filter((t) => t.topic === g), g)));
    sidebar.append(el("p", "sidebar-hint", "Click any result to copy it."));
  }
  markCurrent();

  // The narrow-window picker always lists the audience's converters.
  picker.replaceChildren();
  for (const g of [...new Set(audience.tools.map((id) => byId.get(id)!.topic))]) {
    const og = Object.assign(document.createElement("optgroup"), { label: g });
    for (const id of audience.tools.filter((id) => byId.get(id)!.topic === g)) {
      og.append(Object.assign(document.createElement("option"), { value: id, textContent: byId.get(id)!.title }));
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
  setNumberStyle(regionInfo(region).number);
  panels = new Map(TOOLS.map((t) => [t.id, renderConverter(t, region)]));
  content.replaceChildren(...panels.values());
}

const currentId = () => {
  const hash = location.hash.slice(1);
  // Each audience opens on the converter it uses most.
  return audience.tools.includes(hash) ? hash : audience.tools[0];
};

function syncUrl() {
  const p = new URLSearchParams();
  if (audience !== EVERYTHING) p.set("for", audience.id);
  p.set("region", region);
  history.replaceState(null, "", `?${p}#${currentId()}`);
}

function setAudience(a: Audience) {
  audience = a;
  store("uom.audience", a.id);
  syncUrl();
  buildControls();
  buildNav();
  show(false);
}

function setRegion(r: Region) {
  region = r;
  store("uom.region", r);
  syncUrl();
  buildControls();
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
  markCurrent();
  picker.value = id;
  if (focus) panels.get(id)!.querySelector<HTMLElement>("input[data-field]")?.focus();
}

/** Open a converter, switching to Everything if the current audience doesn't list it. */
function open(id: string, focus = true) {
  if (!audience.tools.includes(id)) setAudience(EVERYTHING);
  if (location.hash === `#${id}`) show(focus);
  else location.hash = id;
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

picker.addEventListener("change", () => (location.hash = picker.value));
window.addEventListener("hashchange", () => show(true));
buildControls();
buildNav();
buildPanels();
syncUrl();
show(false);
