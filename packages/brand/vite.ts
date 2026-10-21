// What an app built with Vite takes from @uom/brand, through plugins: the app icon (the website, the
// Windows app) and the photos (every app).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const ICON = fileURLToPath(new URL("./app-icon.svg", import.meta.url));
/** The photos' folder, for the plugin below and for checks that the files are there (@uom/ui's photos.test.ts). */
export const PHOTOS = fileURLToPath(new URL("./photos", import.meta.url));

/**
 * The app icon at /app-icon.svg: served by the dev server, and written into the build, the same
 * file in every app. The page links it as "/app-icon.svg"; that becomes the app's base path, as
 * Vite does for a public folder's files.
 */
export function appIcon(): Plugin {
  let base = "/";
  return {
    name: "uom-app-icon",
    configResolved(config) {
      base = config.base;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== `${base}app-icon.svg`) return next();
        res.setHeader("Content-Type", "image/svg+xml");
        res.end(readFileSync(ICON));
      });
    },
    transformIndexHtml: {
      order: "post",
      handler: (html) => html.replaceAll('"/app-icon.svg"', `"${base}app-icon.svg"`),
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "app-icon.svg", source: readFileSync(ICON) });
    },
  };
}

/**
 * The photos as "@uom/brand/photos/", for an app's import.meta.glob (see @uom/ui/photos), which
 * takes an alias but not a package's exports.
 */
export function photos(): Plugin {
  return {
    name: "uom-photos",
    config: () => ({ resolve: { alias: [{ find: /^@uom\/brand\/photos\//, replacement: `${PHOTOS}/` }] } }),
  };
}
