// Runs the native project's Gradle with the Android SDK and a Java it can use, so the npm scripts
// work without setting JAVA_HOME or ANDROID_HOME first: `node gradle.cjs <tasks>` in apps/android.
// Gradle 8 can't run on the newest Java, so Android Studio's own (jbr) comes first.
// After installDebug, `--launch` starts the app on the running emulator or device.

const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const PROJECT = path.join(__dirname, "native");
const win = process.platform === "win32";
const local = process.env.LOCALAPPDATA ?? "";
const first = (...dirs) => dirs.find((d) => d && fs.existsSync(d));

const sdk = first(process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, path.join(local, "Android", "Sdk"), path.join(process.env.HOME ?? "", "Library", "Android", "sdk"));
const java = first(
  process.env.UOM_JAVA_HOME,
  "C:\Program Files\Android\Android Studio\jbr",
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
// Gradle reads the SDK's location from here; it's per machine, so it isn't committed.
// A .properties file: forward slashes, and the drive's colon escaped (C\:/Users/...).
fs.writeFileSync(path.join(PROJECT, "local.properties"), `sdk.dir=${sdk.split(path.sep).join("/").replace(":", "\\:")}\n`);

const args = process.argv.slice(2);
const launch = args.includes("--launch");
const tasks = args.filter((a) => a !== "--launch");
// Java ignores HTTPS_PROXY; pass it on as Java's own settings, for the wrapper's download of Gradle
// (GRADLE_OPTS) and for the build's downloads (-D on the command line). Java's default already
// leaves localhost out.
const proxy = [];
for (const [scheme, value] of [["https", process.env.HTTPS_PROXY ?? process.env.https_proxy], ["http", process.env.HTTP_PROXY ?? process.env.http_proxy]]) {
  if (!value) continue;
  const u = new URL(value);
  proxy.push(`-D${scheme}.proxyHost=${u.hostname}`, `-D${scheme}.proxyPort=${u.port || (u.protocol === "https:" ? 443 : 80)}`);
}
const env = { ...process.env, JAVA_HOME: java, ANDROID_HOME: sdk, GRADLE_OPTS: [process.env.GRADLE_OPTS, ...proxy].filter(Boolean).join(" ") };
const gradlew = path.join(PROJECT, win ? "gradlew.bat" : "gradlew");
const r = spawnSync(win ? `"${gradlew}"` : gradlew, [...proxy, ...tasks], { cwd: PROJECT, env, stdio: "inherit", shell: win });
if (r.status !== 0) process.exit(r.status ?? 1);

if (launch) {
  const adb = path.join(sdk, "platform-tools", win ? "adb.exe" : "adb");
  execFileSync(adb, ["shell", "am", "start", "-n", "com.uomconverter.app/.MainActivity"], { stdio: "inherit" });
}
