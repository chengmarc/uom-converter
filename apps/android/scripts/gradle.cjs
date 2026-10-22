// Runs the native project's Gradle with the Android SDK and a Java it can use (sdk.cjs), so the npm
// scripts work without setting JAVA_HOME or ANDROID_HOME first: `node scripts/gradle.cjs <tasks>`
// in apps/android. An install task first makes sure an emulator or phone is there, starting an
// emulator if need be. After it, `--launch` starts the app, and `--reverse=<port>` first lets the
// app reach that port on this computer as localhost:<port>.

const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { adb, ensureDevice, java, sdk } = require("./sdk.cjs");

const PROJECT = path.join(__dirname, "..", "native");
const win = process.platform === "win32";

// Gradle reads the SDK's location from here; it's per machine, so it isn't committed.
// A .properties file: forward slashes, and the drive's colon escaped (C\:/Users/...).
fs.writeFileSync(path.join(PROJECT, "local.properties"), `sdk.dir=${sdk.split(path.sep).join("/").replace(":", "\\:")}\n`);

const args = process.argv.slice(2);
const launch = args.includes("--launch");
const reverse = args.find((a) => a.startsWith("--reverse="))?.slice("--reverse=".length);
const tasks = args.filter((a) => a !== "--launch" && !a.startsWith("--reverse="));
// Java ignores HTTPS_PROXY; pass it on as Java's own settings, for the wrapper's download of Gradle
// (GRADLE_OPTS) and for the build's downloads (-D on the command line). Java's default already
// leaves localhost out.
const proxy = [];
for (const [scheme, value] of [["https", process.env.HTTPS_PROXY ?? process.env.https_proxy], ["http", process.env.HTTP_PROXY ?? process.env.http_proxy]]) {
  if (!value) continue;
  const u = new URL(value);
  proxy.push(`-D${scheme}.proxyHost=${u.hostname}`, `-D${scheme}.proxyPort=${u.port || (u.protocol === "https:" ? 443 : 80)}`);
}
if (tasks.some((t) => t.startsWith("install"))) ensureDevice();
// A release build without the upload key comes out unsigned, and Play refuses it (native/app/build.gradle).
if (tasks.some((t) => t.endsWith("Release"))) {
  const { UOM_UPLOAD_KEYSTORE: keystore, UOM_UPLOAD_PASSWORD: password } = process.env;
  if (!keystore || !fs.existsSync(keystore) || !password) {
    console.error("A release build needs the upload key: set UOM_UPLOAD_KEYSTORE to its .jks file and UOM_UPLOAD_PASSWORD (apps/android/README.md).");
    process.exit(1);
  }
}

const env = { ...process.env, JAVA_HOME: java, ANDROID_HOME: sdk, GRADLE_OPTS: [process.env.GRADLE_OPTS, ...proxy].filter(Boolean).join(" ") };
const gradlew = path.join(PROJECT, win ? "gradlew.bat" : "gradlew");
const r = spawnSync(win ? `"${gradlew}"` : gradlew, [...proxy, ...tasks], { cwd: PROJECT, env, stdio: "inherit", shell: win });
if (r.status !== 0) process.exit(r.status ?? 1);

// What ships, copied out of Gradle's build folder into dist/ under names that say what they are.
const { version } = require("../../../package.json");
const OUTPUTS = {
  bundleRelease: ["bundle/release/app-release.aab", `UOM-Converter-${version}.aab`],
  assembleDebug: ["apk/debug/app-debug.apk", "UOM-Converter-debug.apk"],
};
for (const [task, [from, to]] of Object.entries(OUTPUTS)) {
  if (!tasks.includes(task)) continue;
  const dist = path.join(__dirname, "..", "dist");
  fs.mkdirSync(dist, { recursive: true });
  fs.copyFileSync(path.join(PROJECT, "app", "build", "outputs", from), path.join(dist, to));
  console.log(path.relative(process.cwd(), path.join(dist, to)));
}

if (reverse) execFileSync(adb, ["reverse", `tcp:${reverse}`, `tcp:${reverse}`], { stdio: "inherit" });
if (launch) {
  execFileSync(adb, ["shell", "am", "start", "-n", "com.chengmarc.uomconverter/.MainActivity"], { stdio: "inherit" });
}
