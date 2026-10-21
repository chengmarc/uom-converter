// The emulator with the app on it: starts the emulator if it isn't running (and either way gives it
// this computer's proxy: sdk.cjs), builds the app and installs it, then leaves the home screen up,
// the app in the drawer. `npm run emulator` (or emulator.cmd).

const { execFileSync, spawnSync } = require("node:child_process");
const path = require("node:path");
const { adb, devices, shareProxy, startEmulator } = require("./sdk.cjs");

const APP = path.join(__dirname, "..");

const running = devices().filter((d) => d.startsWith("emulator-"));
if (running.length) running.forEach(shareProxy);
else startEmulator();

// The build the release ships, not the dev server's: without UOM_DEV_URL (capacitor.config.ts).
const env = { ...process.env };
delete env.UOM_DEV_URL;
for (const command of ["npm run sync", `"${process.execPath}" scripts/gradle.cjs installDebug`]) {
  const r = spawnSync(command, { cwd: APP, env, stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

execFileSync(adb, ["-e", "shell", "input", "keyevent", "KEYCODE_HOME"]);
console.log("UOM Converter is installed: swipe up on the home screen to find it.");
