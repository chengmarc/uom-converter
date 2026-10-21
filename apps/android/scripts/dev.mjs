// Live preview of the Android app on an emulator or USB-connected phone (with neither, it starts
// your emulator: sdk.cjs). Vite's dev server for the page, and a debug build of the app that loads
// it from there, so a saved change appears on the phone at once. `npm run android:dev`; Ctrl+C or
// closing the console stops it.
//   1. builds the page and syncs the native project with UOM_DEV_URL set (capacitor.config.ts)
//   2. installs and opens the app, with the phone's localhost:<port> reaching this computer's
//   3. when stopped, syncs again without it, so the native project holds the real page again
// The app installed on the phone keeps loading from the dev server until the next
// `npm run android:run`. Changes to native/ need the command run again.

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build, createServer } from "vite";

const APP = fileURLToPath(new URL("..", import.meta.url));
const configFile = `${APP}vite.config.ts`;
const cap = createRequire(import.meta.url).resolve("@capacitor/cli/bin/capacitor");

function run(args, env = {}) {
  const r = spawnSync(process.execPath, args, { cwd: APP, stdio: "inherit", env: { ...process.env, ...env } });
  if (r.status !== 0) throw new Error(`Failed: node ${args.join(" ")}`);
}

// cap sync copies the built page too, so there must be one.
await build({ configFile, logLevel: "warn" });

const server = await createServer({ configFile, server: { host: "127.0.0.1" } });
await server.listen();
const url = server.resolvedUrls.local[0];
const { port } = new URL(url);

let restored = false;
function restore() {
  if (restored) return;
  restored = true;
  run([cap, "copy", "android"]);
}

try {
  run([cap, "sync", "android"], { UOM_DEV_URL: url });
  run(["scripts/gradle.cjs", "installDebug", "--launch", `--reverse=${port}`]);
} catch (e) {
  restore();
  await server.close();
  console.error(e.message);
  process.exit(1);
}

server.printUrls();
console.log("\n  Live on the phone. Ctrl+C to stop.\n");
// Ctrl+C, or (SIGHUP) closing the console window, which on Windows leaves a few seconds to tidy up.
for (const signal of ["SIGINT", "SIGHUP"]) {
  process.on(signal, async () => {
    restore();
    await server.close();
    process.exit(0);
  });
}
