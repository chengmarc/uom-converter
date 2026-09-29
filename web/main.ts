import type { Region } from "../src/reference";
import { AUDIENCES, type Audience } from "./audiences";
import { TOOLS } from "./converters";
import { icon } from "./icons";
import { guessRegion, regionInfo, REGIONS } from "./regions";
import { renderConverter, setNumberStyle } from "./ui";

const byId = new Map(TOOLS.map((t) => [t.id, t]));

// Every id an audience lists must exist, so a rename can't silently drop a tool from a view.
for (const a of AUDIENCES) for (const id of a.tools) if (!byId.has(id)) throw new Error(`Audience ${a.id}: unknown tool ${id}`);

const EVERYTHING: Audience = { id: "all", label: "Everything", description: "Every converter, grouped by topic.", tools: TOOLS.map((t) => t.id) };

// ---------- Page ----------

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
  const groups = [...new Set(visible.map((t) => t.group))];
  sidebar.replaceChildren();
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
    for (const t of visible.filter((x) => x.group === g)) {
      const a = Object.assign(document.createElement("a"), { href: `#${t.id}`, textContent: t.title });
      a.dataset.id = t.id;
      section.append(a);
      og.append(Object.assign(document.createElement("option"), { value: t.id, textContent: t.title }));
    }
    sidebar.append(section);
    picker.append(og);
  }
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

function show(focus: boolean) {
  const id = currentId();
  for (const [pid, panel] of panels) panel.hidden = pid !== id;
  sidebar.querySelectorAll("a").forEach((a) => {
    if (a.dataset.id === id) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  picker.value = id;
  if (focus) panels.get(id)!.querySelector<HTMLElement>("input[data-field]")?.focus();
}

picker.addEventListener("change", () => (location.hash = picker.value));
window.addEventListener("hashchange", () => show(true));
buildControls();
buildNav();
buildPanels();
syncUrl();
show(false);
