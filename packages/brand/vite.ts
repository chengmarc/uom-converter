// The app icon at /app-icon.svg in an app built with Vite (the website, the Windows app): served
// by the dev server, and written into the build, the same file in every app. The page links it as
// "/app-icon.svg"; that becomes the app's base path, as Vite does for a public folder's files.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

const ICON = resolve(__dirname, "app-icon.svg");

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
