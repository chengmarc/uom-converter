// Where this machine's Android SDK is, and a Java that Gradle can run on, for the scripts here; and
// ensureDevice(), for the ones that install the app. Gradle 8 can't run on the newest Java, so
// Android Studio's own (jbr) comes first.

const { execFileSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const win = process.platform === "win32";
const local = process.env.LOCALAPPDATA ?? "";
const first = (...dirs) => dirs.find((d) => d && fs.existsSync(d));

const sdk = first(process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, path.join(local, "Android", "Sdk"), path.join(process.env.HOME ?? "", "Library", "Android", "sdk"));
const java = first(
  process.env.UOM_JAVA_HOME,
  String.raw`C:\Program Files\Android\Android Studio\jbr`,
  path.join(local, "Programs", "Android Studio", "jbr"),
  "/Applications/Android Studio.app/Contents/jbr/Contents/Home",
  process.env.JAVA_HOME,
);
if (!sdk) {
  console.error("No Android SDK found. Install Android Studio (its setup installs the SDK), or set ANDROID_HOME.");
  process.exit(1);
}
if (!java) {
  console.error("No Java found for Gradle. Install Android Studio, or set UOM_JAVA_HOME to a JDK 17 or 21.");
  process.exit(1);
}

const adb = path.join(sdk, "platform-tools", win ? "adb.exe" : "adb");
const emulator = path.join(sdk, "emulator", win ? "emulator.exe" : "emulator");

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** Emulators and USB phones that are up and allow installs. */
function devices() {
  return execFileSync(adb, ["devices"], { encoding: "utf8" })
    .split(/\r?\n/)
    .slice(1)
    .filter((line) => /\tdevice$/.test(line.trimEnd()));
}

/** The emulator to start when none is running, if Android Studio's Device Manager has it. */
const PREFERRED_AVD = "Pixel_8";

/**
 * Somewhere to install the app: with no emulator or phone connected, starts an emulator (UOM_AVD,
 * else PREFERRED_AVD, else the first in the Device Manager) and waits for it to boot. It stays
 * open after, so the next run finds it.
 */
function ensureDevice() {
  if (devices().length) return;
  const avds = execFileSync(emulator, ["-list-avds"], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
  const avd = process.env.UOM_AVD ?? (avds.includes(PREFERRED_AVD) ? PREFERRED_AVD : avds[0]);
  if (!avd) {
    console.error("No emulator or phone connected. Create an emulator in Android Studio's Device Manager, or plug in a phone with USB debugging on.");
    process.exit(1);
  }
  console.log(`No emulator or phone connected: starting the ${avd} emulator...`);
  spawn(emulator, ["-avd", avd], { detached: true, stdio: "ignore", windowsHide: true }).unref();
  const deadline = Date.now() + 5 * 60_000;
  for (;;) {
    let booted = "";
    try {
      booted = execFileSync(adb, ["shell", "getprop", "sys.boot_completed"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
      // Not connected yet.
    }
    if (booted === "1") return;
    if (Date.now() > deadline) {
      console.error(`The ${avd} emulator didn't finish starting within 5 minutes.`);
      process.exit(1);
    }
    sleep(2000);
  }
}

module.exports = { sdk, java, adb, ensureDevice };
