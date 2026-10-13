// The page inside the Android app (app/), built into apps/android/dist/. `npx cap sync`
// copies it into the native project (native/), which serves it from https://localhost.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

// One version for every app: the repo's.
const { version } = JSON.parse(readFileSync(resolve(__dirname, "../../package.json"), "utf8"));

export default defineConfig({
  root: resolve(__dirname, "app"),
  base: "./",
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: { outDir: resolve(__dirname, "dist"), emptyOutDir: true },
});
