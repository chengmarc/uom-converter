// The page inside the Android app (src/), built into apps/android/build/web/. `npx cap sync`
// copies it into the native project (native/), which serves it from https://localhost.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { photos } from "@uom/brand/vite";

// One version for every app: the repo's.
const { version } = JSON.parse(readFileSync(resolve(__dirname, "../../package.json"), "utf8"));

export default defineConfig({
  root: resolve(__dirname, "src"),
  base: "./",
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: { outDir: resolve(__dirname, "build", "web"), emptyOutDir: true },
  plugins: [photos()],
});
