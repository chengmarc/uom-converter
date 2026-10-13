// The page inside the Windows app (app/), built with relative paths into platforms/windows/dist/,
// where electron/main.cjs serves it from app://. Converters link by #<id>.

import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: resolve(__dirname, "app"),
  base: "./",
  build: { outDir: resolve(__dirname, "dist"), emptyOutDir: true },
});
