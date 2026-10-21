// Every page's <body>, drawn at build time by the site's own script.

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { BASE, OUT, SITE_URL } from "./site";

/** A link as the page draws it: its text, and the absolute address. */
export interface Link {
  name: string;
  url: string;
}

export const BODY = /(<body>)([\s\S]*)(<\/body>)/;

/** A page as the site's script draws it, and what the build reads from it. */
export interface Drawn {
  body: string;
  /** The page's <h1>. */
  name: string;
  /** The breadcrumb trail above the <h1>: the home page, then a converter's topic. */
  trail: Link[];
  /** A topic page's converters, in its list. */
  items: Link[];
  /** The region buttons: "US (NEC, 60 Hz)". */
  regions: string[];
}

/**
 * Each page's <body> as the site's script draws it at that address, so the HTML that's served
 * already has the converter, its explanation and the links to every other page: search engines,
 * link previews and readers without JavaScript get the page, not an empty <main>. The built
 * script runs in happy-dom, a browser for Node; in the browser it runs again and redraws the
 * page with the visitor's region. Drawn for the US, the region most visitors get.
 */
export async function prerender(shell: string, paths: string[]): Promise<Drawn[]> {
  const src = shell.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/)?.[1];
  const body = shell.match(BODY)?.[2];
  if (!src || !body) throw new Error("index.html: expected the module script and a <body>");
  const script = pathToFileURL(join(OUT, src.slice(BASE.length))).href;
  const out: Drawn[] = [];
  for (const [i, path] of paths.entries()) {
    GlobalRegistrator.register({ url: new URL(path, SITE_URL).href });
    try {
      document.body.innerHTML = body;
      // A fresh copy of the script for each page: the query makes it a different module to Node.
      await import(`${script}?page=${i}`);
      // What was typed or picked is a property, which HTML doesn't keep: write it as the attribute.
      document.querySelectorAll("input").forEach((e) => e.setAttribute("value", e.value));
      document.querySelectorAll("option").forEach((e) => e.toggleAttribute("selected", e.selected));
      const name = document.querySelector("main h1")?.textContent?.trim();
      if (!name) throw new Error(`${path}: expected an <h1>`);
      const links = (selector: string) =>
        Array.from(document.querySelectorAll<HTMLAnchorElement>(selector), (a) => ({ name: (a.querySelector(".tile-title") ?? a).textContent!.trim(), url: new URL(a.href, SITE_URL).href }));
      out.push({
        body: document.body.innerHTML,
        name,
        trail: links("main .crumbs a"),
        items: links("main .topic-page > .tiles a"),
        regions: Array.from(document.querySelectorAll("#region button"), (b) => `${b.textContent} (${b.getAttribute("title")})`),
      });
    } finally {
      await GlobalRegistrator.unregister();
    }
  }
  return out;
}
