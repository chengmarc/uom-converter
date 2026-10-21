/// <reference types="vite/client" />
// The Android app: a home screen of converter cards, two across (the ones opened last, then by
// topic; search, and a filter by role), and a screen per converter at #<id>. Opening a converter
// adds a history entry, so the system Back gesture returns to the list; Back on the list leaves
// the app. Region lives in a settings sheet.

// Bundled with the app: the page may only load its own files (see the CSP in index.html).
import "@fontsource-variable/inter/opsz.css";
import { App } from "@capacitor/app";
import { Clipboard } from "@capacitor/clipboard";
import { StatusBar, Style } from "@capacitor/status-bar";
import type { Region } from "@uom/core/region";
import { TOOLS } from "@uom/converters";
import { setNumberStyle } from "@uom/converters/format";
import { dyn, type Converter, type Topic, type Values } from "@uom/converters/model";
import { guessRegion, regionInfo, REGIONS } from "@uom/converters/regions";
import { ALL_AUDIENCES, EVERYTHING } from "@uom/ui/audiences";
import { el, renderConverter, setClipboard } from "@uom/ui/converter";
import { icon } from "@uom/ui/icons";
import { photoLibrary, TOPIC_SLOTS } from "@uom/ui/photos";
import { search } from "@uom/ui/search";
import { store, stored } from "@uom/ui/storage";

declare const __APP_VERSION__: string;

// The web view's own clipboard needs permissions an app page doesn't get; the plugin doesn't.
setClipboard((text) => Clipboard.write({ string: text }));

// Controls only this app draws: 24×24 strokes, like packages/ui/src/icons.ts.
const GLYPHS = {
  back: "M19 12H5 M11 6l-6 6 6 6",
  settings: "M4 7h10 M18 7h2 M4 17h4 M12 17h8 M16 5v4 M10 15v4",
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

// The topic photos (@uom/ui/photos), all decorative (the text beside each names the topic): the
// square, small beside a card's name and at a phone's width behind a converter's screen, so at
// every size; and the 6:1 banner under the tint of a topic's band, where its 800px look as sharp
// as any.
const photo = photoLibrary(
  import.meta.glob<string>(["@uom/brand/photos/*-thumb-*.webp", "@uom/brand/photos/*-banner-800.webp"], {
    eager: true,
    query: "?url",
    import: "default",
  }),
);

/** A band with the topic's photo under a light shade, and its icon and name on it. */
function topicBand(topic: Topic) {
  const band = el("h2", "topic-band");
  const img = photo(`${TOPIC_SLOTS[topic]}-banner`, "100vw", "", "topic-band-photo");
  if (img) band.append(img);
  const i = icon(topic);
  if (i) band.append(i);
  band.append(topic);
  return band;
}

const byId = new Map(TOOLS.map((t) => [t.id, t]));
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

let audience = ALL_AUDIENCES.find((a) => a.id === stored("uom.audience")) ?? EVERYTHING;

/** The converters opened last, newest first: the home screen's Recent cards. */
const RECENT_MAX = 4;
let recent: string[] = (() => {
  try {
    const ids: unknown = JSON.parse(stored("uom.recent") ?? "[]");
    return Array.isArray(ids) ? ids.filter((id) => byId.has(id)).slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
})();
function addRecent(id: string) {
  recent = [id, ...recent.filter((r) => r !== id)].slice(0, RECENT_MAX);
  store("uom.recent", JSON.stringify(recent));
}
let region: Region = REGIONS.find((r) => r.id === stored("uom.region"))?.id ?? guessRegion();

/** Descriptions only read the region. */
const blurb = (t: Converter) => dyn(t.blurb, { region } as Values);

// ---------- Home: the cards ----------

/**
 * A converter's card: its name, and its topic's photo where the cards around it are of mixed
 * topics. The description is only read out (it shows on the converter's screen): cut to fit, it
 * said little.
 */
function card(t: Converter, withTopic: boolean) {
  const a = el("a", "card");
  a.href = `#${t.id}`;
  const img = withTopic ? photo(`${TOPIC_SLOTS[t.topic]}-thumb`, "36px", "", "card-photo") : undefined;
  if (img) a.append(img);
  a.append(el("span", "card-title", t.title), el("span", "sr", `. ${blurb(t)}`));
  return a;
}

/** A heading and its cards: a topic's band, or else a plain heading and the topic on each card. */
function group(title: string, tools: Converter[], topic?: Topic) {
  const s = el("section", "group");
  const h = topic ? topicBand(topic) : el("h2", "group-title", title);
  const cards = el("div", "cards");
  cards.append(...tools.map((t) => card(t, !topic)));
  s.append(h, cards);
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
    const found = search(query, audience, region);
    list.replaceChildren(found.length ? group("Matches", found) : el("p", "list-empty", "No converter matches."));
    return;
  }
  const visible = audience.tools.map((id) => byId.get(id)!);
  list.replaceChildren(
    ...(recent.length ? [group("Recent", recent.map((id) => byId.get(id)!))] : []),
    ...TOPICS.filter((topic) => visible.some((t) => t.topic === topic)).map((topic) =>
      group(topic, visible.filter((t) => t.topic === topic), topic),
    ),
  );
}

q.addEventListener("input", drawList);
q.addEventListener("keydown", (e) => {
  // Search key on the keyboard: open the best match.
  if (e.key === "Enter") {
    const first = list.querySelector<HTMLAnchorElement>("a.card");
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

const backdrop = $("#backdrop");
let backdropTopic: Topic | undefined;
/** Behind a converter's screen: its topic's photo, faint, at the foot (style.css .backdrop), as in the Windows app. */
function showBackdrop(topic: Topic) {
  if (topic === backdropTopic) return;
  backdropTopic = topic;
  const img = photo(`${TOPIC_SLOTS[topic]}-thumb`, "100vw", "");
  backdrop.replaceChildren(...(img ? [img] : []));
}

let homeScroll = 0;

// The status bar's clock and icons, over the page since it draws edge to edge: light in the dark
// theme, dark in the light one.
const darkTheme = matchMedia("(prefers-color-scheme: dark)");
function statusBar() {
  const light = darkTheme.matches;
  // Style.Dark is for a dark background: light icons. Outside the app (vite's dev server in a
  // browser) there's no status bar.
  StatusBar.setStyle({ style: light ? Style.Dark : Style.Light }).catch(() => {});
}
darkTheme.addEventListener("change", statusBar);

function show() {
  const id = location.hash.slice(1);
  const conv = byId.get(id);
  if (conv && !home.hidden) homeScroll = window.scrollY;
  home.hidden = !!conv;
  screen.hidden = !conv;
  statusBar();
  if (conv) {
    screenTitle.textContent = conv.title;
    content.replaceChildren(panel(id));
    showBackdrop(conv.topic);
    window.scrollTo(0, 0);
    addRecent(id);
  } else {
    // Back on the list where you left it, search and all, with Recent brought up to date.
    drawList();
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
  const a = (e.target as Element).closest<HTMLAnchorElement>("a.card");
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
