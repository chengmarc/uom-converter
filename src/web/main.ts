import type { Region } from "../core/region";
import { AUDIENCES, type Audience } from "./audiences";
import { TOOLS } from "./converters";
import { icon } from "./icons";
import { guessRegion, regionInfo, REGIONS } from "./regions";
import { setNumberStyle } from "./format";
import { dyn, renderConverter, type Converter, type Values } from "./ui";

// audiences.test.ts checks every id an audience lists exists.
const byId = new Map(TOOLS.map((t) => [t.id, t]));

const EVERYTHING: Audience = { id: "all", label: "Everything", description: "Every converter, grouped by topic.", tools: TOOLS.map((t) => t.id) };

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

function buildNav() {
  const visible = audience.tools.map((id) => byId.get(id)!);
  // Groups in order of their first tool, tools in the audience's priority order.
  const groups = [...new Set(visible.map((t) => t.topic))];
  // What this audience is for, at the head of its list (under the tabs instead on narrow screens).
  sidebar.replaceChildren(Object.assign(document.createElement("p"), { className: "sidebar-desc", textContent: audience.description }));
  picker.replaceChildren();
  for (const g of groups) {
    const section = document.createElement("div");
    section.className = "nav-group";
    const h = document.createElement("h2");
    const i = icon(g);
    if (i) h.append(i);
    h.append(g);
    section.append(h);
    const og = Object.assign(document.createElement("optgroup"), { label: g });
    for (const t of visible.filter((x) => x.topic === g)) {
      const a = Object.assign(document.createElement("a"), { href: `#${t.id}`, textContent: t.title });
      a.dataset.id = t.id;
      section.append(a);
      og.append(Object.assign(document.createElement("option"), { value: t.id, textContent: t.title }));
    }
    sidebar.append(section);
    picker.append(og);
  }
  sidebar.append(Object.assign(document.createElement("p"), { className: "sidebar-hint", textContent: "Click any result to copy it." }));
}

let panels = new Map<string, HTMLElement>();
function buildPanels() {
  setNumberStyle(regionInfo(region).number);
  panels = new Map(TOOLS.map((t) => [t.id, renderConverter(t, region)]));
  content.replaceChildren(...panels.values());
}

const currentId = () => {
  const hash = location.hash.slice(1);
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
  sidebar.querySelectorAll("a").forEach((a) => {
    if (a.dataset.id === id) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  picker.value = id;
  if (focus) panels.get(id)!.querySelector<HTMLElement>("input[data-field]")?.focus();
}

/** Open a converter, switching to Everything if the current audience doesn't list it. */
function open(id: string, focus = true) {
  if (!audience.tools.includes(id)) setAudience(EVERYTHING);
  if (location.hash === `#${id}`) show(focus);
  else location.hash = id;
}

// ---------- Keyboard ----------

// Up and down arrows move through the sidebar like a list, keeping focus there.
sidebar.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  const links = Array.from(sidebar.querySelectorAll<HTMLAnchorElement>("a[data-id]"));
  const next = links[links.indexOf(e.target as HTMLAnchorElement) + (e.key === "ArrowDown" ? 1 : -1)];
  if (!next) return;
  e.preventDefault();
  next.focus();
  history.replaceState(null, "", `#${next.dataset.id}`);
  show(false);
});

// Quick switcher: Ctrl+K, type part of a name, Enter.
const switcher = document.querySelector<HTMLDialogElement>("#switcher")!;
const switcherInput = document.querySelector<HTMLInputElement>("#switcher-input")!;
const switcherList = document.querySelector<HTMLElement>("#switcher-list")!;
let matches: Converter[] = [];
let active = 0;
let lastPointer = "";

function renderMatches() {
  const words = switcherInput.value.toLowerCase().split(/\s+/).filter(Boolean);
  const has = (text: string) => words.every((w) => text.toLowerCase().includes(w));
  // Name matches first, then description matches; within each, the audience's own order.
  const byName = (t: Converter) => has(`${t.title} ${t.topic} ${t.id}`);
  const blurb = (t: Converter) => dyn(t.blurb, { region } as Values); // descriptions only read the region
  const rank = (t: Converter) =>
    (byName(t) ? 0 : 2 * TOOLS.length) + (audience.tools.includes(t.id) ? audience.tools.indexOf(t.id) : TOOLS.length + TOOLS.indexOf(t));
  matches = TOOLS.filter((t) => byName(t) || has(blurb(t))).sort((a, b) => rank(a) - rank(b));
  switcherList.replaceChildren(
    ...matches.map((t, i) => {
      const li = Object.assign(document.createElement("li"), { id: `switch-${t.id}`, role: "option" });
      const where = audience.tools.includes(t.id) ? t.topic : `${t.topic} · in Everything`;
      li.append(t.title, Object.assign(document.createElement("small"), { textContent: where }));
      li.addEventListener("click", () => choose(t));
      // Chromium also fires pointermove when the list changes under a still pointer; only a real move counts.
      li.addEventListener("pointermove", (e) => {
        const at = `${e.screenX},${e.screenY}`;
        if (at === lastPointer) return;
        lastPointer = at;
        setActive(i);
      });
      return li;
    }),
  );
  if (!matches.length) switcherList.append(Object.assign(document.createElement("li"), { className: "none", textContent: "No converter matches." }));
  setActive(0);
}

function setActive(i: number) {
  active = i;
  switcherList.querySelectorAll("[role=option]").forEach((li, j) => li.setAttribute("aria-selected", String(j === i)));
  switcherInput.setAttribute("aria-activedescendant", matches[i] ? `switch-${matches[i].id}` : "");
  switcherList.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
}

function openSwitcher() {
  if (switcher.open) return;
  switcherInput.value = "";
  renderMatches();
  switcher.showModal();
  switcherInput.focus();
}

function choose(t: Converter) {
  switcher.close();
  open(t.id);
}

switcherInput.addEventListener("input", renderMatches);
switcherInput.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    if (matches.length) setActive((active + (e.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length);
  } else if (e.key === "Enter" && matches[active]) {
    e.preventDefault();
    choose(matches[active]);
  }
});
// A click on the dimmed backdrop lands on the dialog itself: close it.
switcher.addEventListener("click", (e) => {
  if (e.target === switcher) switcher.close();
});
document.querySelector("#find")!.addEventListener("click", openSwitcher);
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") {
    e.preventDefault();
    openSwitcher();
  }
});

picker.addEventListener("change", () => (location.hash = picker.value));
window.addEventListener("hashchange", () => show(true));
buildControls();
buildNav();
buildPanels();
syncUrl();
show(false);
