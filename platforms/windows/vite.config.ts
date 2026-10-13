// The page inside the Windows app: for now the web platform's page (platforms/web), built with
// relative paths into platforms/windows/dist/, where electron/main.cjs serves it from app://.
// Without the website's base path the page keeps #<id> links and leaves out the website's extras.

import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: resolve(__dirname, "../web"),
  base: "./",
  build: { outDir: resolve(__dirname, "dist"), emptyOutDir: true },
});
