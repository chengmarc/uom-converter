// The page inside the Windows app (src/renderer/), built with relative paths into apps/windows/dist/,
// where src/main/main.cjs serves it from app://. Converters link by #<id>.

import { resolve } from "node:path";
import { defineConfig } from "vite";
import { appIcon } from "../../packages/brand/vite";

export default defineConfig({
  root: resolve(__dirname, "src", "renderer"),
  publicDir: false,
  base: "./",
  build: { outDir: resolve(__dirname, "dist"), emptyOutDir: true },
  // The app icon, at /app-icon.svg.
  plugins: [appIcon()],
});
