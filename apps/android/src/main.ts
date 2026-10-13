// The Android app: a home screen listing the converters (search, and a filter by role), and a
// screen per converter at #<id>. Opening a converter adds a history entry, so the system Back
// gesture returns to the list; Back on the list leaves the app. Region lives in a settings sheet.

// Bundled with the app: the page may only load its own files (see the CSP in index.html).
import "@fontsource-variable/inter/opsz.css";
import { App } from "@capacitor/app";
import { Clipboard } from "@capacitor/clipboard";
import type { Region } from "@uom/core/region";
import { TOOLS } from "@uom/converters";
import { setNumberStyle } from "@uom/converters/format";
import { dyn, type Converter, type Topic, type Values } from "@uom/converters/model";
import { guessRegion, regionInfo, REGIONS } from "@uom/converters/regions";
import { AUDIENCES, type Audience } from "@uom/ui/audiences";
import { el, renderConverter, setClipboard } from "@uom/ui/converter";
import { icon } from "@uom/ui/icons";

declare const __APP_VERSION__: string;

// The web view's own clipboard needs permissions an app page doesn't get; the plugin doesn't.
setClipboard((text) => Clipboard.write({ string: text }));

// Controls only this app draws: 24×24 strokes, like packages/ui/src/icons.ts.
const GLYPHS = {
  back: "M19 12H5 M11 6l-6 6 6 6",
  settings: "M4 7h10 M18 7h2 M4 17h4 M12 17h8 M16 5v4 M10 15v4",
  chevron: "M9 6l6 6-6 6",
};
function glyph(name: keyof typeof GLYPHS) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "icon");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", GLYPHS[name]);
  svg.append(path);
  return svg;
}

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

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const home = $("#home");
const screen = $("#screen");
const screenTitle = $("#screen-title");
const content = $("#content");
const list = $("#list");
const roles = $("#roles");
const q = $<HTMLInputElement>("#q");
const settings = $<HTMLDialogElement>("#settings");

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
    // Storage blocked: the choice still applies until the app closes.
  }
}

let audience = ALL_AUDIENCES.find((a) => a.id === stored("uom.audience")) ?? EVERYTHING;
let region: Region = REGIONS.find((r) => r.id === stored("uom.region"))?.id ?? guessRegion();

/** Descriptions only read the region. */
const blurb = (t: Converter) => dyn(t.blurb, { region } as Values);

// ---------- Home: the list ----------

/** Converters matching the search: name matches before description matches, each in the audience's order. */
function search(query: string): Converter[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const has = (text: string) => words.every((w) => text.toLowerCase().includes(w));
  const byName = (t: Converter) => has(`${t.title} ${t.topic} ${t.id}`);
  const rank = (t: Converter) =>
    (byName(t) ? 0 : 2 * TOOLS.length) + (audience.tools.includes(t.id) ? audience.tools.indexOf(t.id) : TOOLS.length + TOOLS.indexOf(t));
  return TOOLS.filter((t) => byName(t) || has(blurb(t))).sort((a, b) => rank(a) - rank(b));
}

function row(t: Converter) {
  const a = el("a", "row-link");
  a.href = `#${t.id}`;
  const text = el("span", "row-text");
  text.append(el("span", "row-title", t.title), el("span", "row-sub", blurb(t)));
  a.append(text, glyph("chevron"));
  return a;
}

function group(title: string, tools: Converter[], topic?: Topic) {
  const s = el("section", "group");
  const h = el("h2", "group-title");
  const i = topic ? icon(topic) : undefined;
  if (i) h.append(i);
  h.append(title);
  s.append(h, ...tools.map(row));
  return s;
}

function drawRoles() {
  roles.replaceChildren(
    ...ALL_AUDIENCES.map((a) => {
      const b = el("button", "chip");
      b.type = "button";
      const i = icon(a.id);
      if (i) b.append(i);
      b.append(a.label);
      b.setAttribute("aria-pressed", String(a === audience));
      b.addEventListener("click", () => {
        audience = a;
        store("uom.audience", a.id);
        drawRoles();
        drawList();
        b.scrollIntoView({ inline: "nearest", block: "nearest" });
      });
      return b;
    }),
  );
}

function drawList() {
  const query = q.value.trim();
  if (query) {
    const found = search(query);
    list.replaceChildren(found.length ? group("Matches", found) : el("p", "list-empty", "No converter matches."));
    return;
  }
  const visible = audience.tools.map((id) => byId.get(id)!);
  list.replaceChildren(
    ...TOPICS.filter((topic) => visible.some((t) => t.topic === topic)).map((topic) =>
      group(topic, visible.filter((t) => t.topic === topic), topic),
    ),
  );
}

q.addEventListener("input", drawList);
q.addEventListener("keydown", (e) => {
  // Search key on the keyboard: open the best match.
  if (e.key === "Enter") {
    const first = list.querySelector<HTMLAnchorElement>("a.row-link");
    if (first) {
      e.preventDefault();
      q.blur();
      open(first.hash.slice(1));
    }
  }
});

// ---------- A converter's screen ----------

// Built once per region, so a converter keeps what was typed while you look at others.
let panels = new Map<string, HTMLElement>();
function panel(id: string) {
  if (!panels.has(id)) panels.set(id, renderConverter(byId.get(id)!, region, "h1"));
  return panels.get(id)!;
}

let homeScroll = 0;

function show() {
  const id = location.hash.slice(1);
  const conv = byId.get(id);
  if (conv && !home.hidden) homeScroll = window.scrollY;
  home.hidden = !!conv;
  screen.hidden = !conv;
  if (conv) {
    screenTitle.textContent = conv.title;
    content.replaceChildren(panel(id));
    window.scrollTo(0, 0);
  } else {
    // Back on the list where you left it, search and all.
    window.scrollTo(0, homeScroll);
  }
}

window.addEventListener("hashchange", show);
$("#back").append(glyph("back"));
$("#back").addEventListener("click", () => {
  // Opened from the list: go back to it. Opened directly: replace with the list.
  if (history.state?.fromList) history.back();
  else location.replace("#");
});
/** Open a converter from the list: a history entry, so Back returns to the list. */
function open(id: string) {
  history.pushState({ fromList: true }, "", `#${id}`);
  show();
}
list.addEventListener("click", (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>("a.row-link");
  if (!a) return;
  e.preventDefault();
  open(a.hash.slice(1));
});

// ---------- Settings ----------

function drawRegions() {
  $("#regions").replaceChildren(
    ...REGIONS.map((r) => {
      const lab = el("label", "choice");
      const input = el("input");
      input.type = "radio";
      input.name = "region";
      input.value = r.id;
      input.checked = r.id === region;
      input.addEventListener("change", () => setRegion(r.id));
      const text = el("span", "choice-text");
      text.append(el("span", undefined, r.label), el("small", undefined, `${r.code}, ${r.hz} Hz`));
      lab.append(input, text);
      return lab;
    }),
  );
}

function setRegion(r: Region) {
  region = r;
  store("uom.region", r);
  setNumberStyle(regionInfo(r).number);
  panels = new Map();
  drawList();
  show();
}

// The sheet is a history entry too, so Back closes it rather than leaving the screen under it.
$("#open-settings").append(glyph("settings"));
$("#open-settings").addEventListener("click", () => {
  history.pushState({ sheet: true }, "", location.hash || "#");
  settings.showModal();
});
const closeSettings = () => {
  if (history.state?.sheet) history.back();
  else settings.close();
};
$("#close-settings").addEventListener("click", closeSettings);
settings.addEventListener("cancel", (e) => {
  e.preventDefault();
  closeSettings();
});
// A tap on the dimmed area outside the sheet closes it.
settings.addEventListener("click", (e) => {
  if (e.target === settings) closeSettings();
});
window.addEventListener("popstate", () => {
  if (settings.open && !history.state?.sheet) settings.close();
});
$("#version").textContent = `Version ${__APP_VERSION__}`;

// Android's Back: a step back through the page's history (the settings sheet, then the list), and
// out of the app from the list. Without this, Back closes the app from any screen.
App.addListener("backButton", ({ canGoBack }) => {
  if (canGoBack) history.back();
  else App.exitApp();
});

// ---------- Start ----------

setNumberStyle(regionInfo(region).number);
drawRoles();
drawList();
drawRegions();
show();
