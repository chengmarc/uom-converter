// The page inside the Windows app (src/), built with relative paths into apps/windows/build/web/,
// where shell/main.cjs serves it from app://. Converters link by #<id>.

import { resolve } from "node:path";
import { defineConfig } from "vite";
import { appIcon, photos } from "@uom/brand/vite";

export default defineConfig({
  root: resolve(__dirname, "src"),
  publicDir: false,
  base: "./",
  build: { outDir: resolve(__dirname, "build", "web"), emptyOutDir: true },
  // The app icon, at /app-icon.svg, and the photos.
  plugins: [appIcon(), photos()],
});
