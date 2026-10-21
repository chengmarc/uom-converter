// Installing the site from the browser and using it offline: the web manifest and sw.js.

import { token } from "@uom/brand/tokens";
import { HOME } from "../src/pages";
import { NAME } from "../src/site";
import { BASE } from "./site";

/** The web manifest: what the browser shows when the site is installed as an app. */
export function manifest(): string {
  return JSON.stringify(
    {
      name: NAME,
      short_name: "UOM",
      description: HOME.description,
      start_url: BASE,
      scope: BASE,
      display: "standalone",
      // The installed app opens on the page's white, under the header's navy.
      background_color: token("surface", "light"),
      theme_color: token("brand", "light"),
      icons: [
        { src: `${BASE}app-icon.svg`, sizes: "any", type: "image/svg+xml" },
        { src: `${BASE}icon-256.png`, sizes: "256x256", type: "image/png" },
      ],
    },
    null,
    2,
  );
}

/** Offline copy: every page and asset cached on install, then served from cache and refreshed in the background. */
export function serviceWorker(files: string[], version: string): string {
  return `// Written by apps/web/generate/offline.ts.
const CACHE = "uom-${version}";
const FILES = ${JSON.stringify(files)};
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("uom-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // Pages are cached without their ?for= and ?region= settings.
      const cached = await cache.match(req, { ignoreSearch: req.mode === "navigate" });
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req.mode === "navigate" ? req.url.split("?")[0] : req, res.clone());
          return res;
        })
        // Offline and not cached: any page will do for a converter's address, since the page picks the converter.
        .catch(async () => cached || (req.mode === "navigate" && (await cache.match(${JSON.stringify(BASE)}))) || Response.error());
      return cached ?? fresh;
    }),
  );
});
`;
}
