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

/** Emulators and USB phones that are up and allow installs, by serial. */
function devices() {
  return execFileSync(adb, ["devices"], { encoding: "utf8" })
    .split(/\r?\n/)
    .slice(1)
    .filter((line) => /\tdevice$/.test(line.trimEnd()))
    .map((line) => line.split("\t")[0]);
}

/**
 * The proxy this computer's own traffic goes through, as host:port, or "" for none: UOM_PROXY if
 * set, else Windows' system proxy (where Clash and the like put theirs).
 */
function hostProxy() {
  if (process.env.UOM_PROXY !== undefined) return process.env.UOM_PROXY;
  if (!win) return "";
  const key = String.raw`HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings`;
  const value = (name) => {
    try {
      const out = execFileSync("reg", ["query", key, "/v", name], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      return out.match(new RegExp(`${name}\\s+REG_\\w+\\s+(.*)`))?.[1].trim() ?? "";
    } catch {
      return "";
    }
  };
  if (value("ProxyEnable") !== "0x1") return "";
  // Either one proxy for everything, or per protocol: "http=host:port;https=host:port".
  const server = value("ProxyServer");
  const perProtocol = Object.fromEntries(server.split(";").map((p) => p.split("=")).filter((p) => p.length === 2));
  return perProtocol.https ?? perProtocol.http ?? server;
}

/**
 * Sends an emulator's web traffic through this computer's proxy, or straight out when there's none.
 * Its own network skips the proxy, so where that's the only way to Google (as in China), Android
 * calls the Wi-Fi "partial connectivity" and the Play Store can't sign in or download. In the
 * emulator, 10.0.2.2 is this computer, so a proxy on localhost is there.
 */
function shareProxy(serial) {
  const proxy = hostProxy().replace(/^(127\.0\.0\.1|localhost):/, "10.0.2.2:") || ":0";
  const shell = (...args) => execFileSync(adb, ["-s", serial, "shell", ...args], { encoding: "utf8" }).trim();
  if (shell("settings", "get", "global", "http_proxy") === proxy) return;
  shell("settings", "put", "global", "http_proxy", proxy);
  // Reconnecting has Android check the connection again with the new setting.
  shell("svc wifi disable; svc data disable; svc wifi enable; svc data enable");
  console.log(proxy === ":0" ? `${serial}: no proxy, straight out.` : `${serial}: web traffic through this computer's proxy (${proxy}).`);
}

/** The emulator to start when none is running, if Android Studio's Device Manager has it. */
const PREFERRED_AVD = "Pixel_8";

/**
 * How the emulator draws: in software, as with the GPU on this (Intel + NVIDIA) laptop apps such as
 * Chrome and the Play Store showed only black in its window. UOM_GPU=host draws with the GPU again.
 */
const GPU = process.env.UOM_GPU ?? "swiftshader_indirect";

/**
 * Starts an emulator (UOM_AVD, else PREFERRED_AVD, else the first in the Device Manager), waits for
 * it to boot and gives it this computer's proxy. It stays open after, so the next run finds it.
 */
function startEmulator() {
  const avds = execFileSync(emulator, ["-list-avds"], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
  const avd = process.env.UOM_AVD ?? (avds.includes(PREFERRED_AVD) ? PREFERRED_AVD : avds[0]);
  if (!avd) {
    console.error("No emulator to start. Create one in Android Studio's Device Manager.");
    process.exit(1);
  }
  console.log(`Starting the ${avd} emulator...`);
  spawn(emulator, ["-avd", avd, "-gpu", GPU], { detached: true, stdio: "ignore", windowsHide: true }).unref();
  const deadline = Date.now() + 5 * 60_000;
  for (;;) {
    let booted = "";
    try {
      booted = execFileSync(adb, ["-e", "shell", "getprop", "sys.boot_completed"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
      // Not connected yet.
    }
    if (booted === "1") {
      devices().filter((d) => d.startsWith("emulator-")).forEach(shareProxy);
      return;
    }
    if (Date.now() > deadline) {
      console.error(`The ${avd} emulator didn't finish starting within 5 minutes.`);
      process.exit(1);
    }
    sleep(2000);
  }
}

/** Somewhere to install the app: with no emulator or phone connected, starts an emulator. */
function ensureDevice() {
  if (devices().length) return;
  console.log("No emulator or phone connected.");
  startEmulator();
}

module.exports = { sdk, java, adb, devices, shareProxy, startEmulator, ensureDevice };
