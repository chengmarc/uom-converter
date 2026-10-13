// The page inside the Windows app (src/renderer/), built with relative paths into apps/windows/dist/,
// where src/main/main.cjs serves it from app://. Converters link by #<id>.

import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: resolve(__dirname, "src", "renderer"),
  // The app icon, at /app-icon.svg (copied into the build as is).
  publicDir: resolve(__dirname, "../../packages/brand/public"),
  base: "./",
  build: { outDir: resolve(__dirname, "dist"), emptyOutDir: true },
});
