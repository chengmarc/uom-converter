// Renders Google Play's listing images from the app's own sources, so they never drift from it:
//   store/feature-graphic.png     1024 × 500, from feature.html
//   store/screenshots/<device>/   phone, 7-inch and 10-inch tablet screenshots, 1080 × 1920, in upload order:
//                                 shots.html (which lists them and their captions) around captures of the built
//                                 page at each device's size, taken into build/shots/<device>/
// The icon is render-icons.cjs's (store/icon-512.png). Run with `npm run android:store`, which builds
// apps/android/dist/ first.

const { app, BrowserWindow, nativeTheme, net, protocol } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const ANDROID = path.join(__dirname, "..");
const DIST = path.join(ANDROID, "dist");
const STORE = __dirname;
const BUILD = path.join(ANDROID, "build");

/**
 * Each device Play asks screenshots for, by its screen in CSS pixels: a common phone (393 × 852 at 3×, the
 * density of most phones today), and the usual 7-inch (600 × 960) and 10-inch (800 × 1280) tablets at 2×.
 */
const DEVICES = {
  phone: { width: 393, height: 852, scale: 3 },
  "tablet-7": { width: 600, height: 960, scale: 2 },
  "tablet-10": { width: 800, height: 1280, scale: 2 },
};
/** The screenshots' layout size, rendered at 3× for 1080 × 1920 (9:16). */
const SHOT = { width: 360, height: 640, scale: 3 };
/** The status bar's height the page pads for, as Capacitor reports it on a phone. */
const STATUS_BAR = "24px";

protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

function offscreen(width, height, scale = 1) {
  return new BrowserWindow({
    width,
    height,
    show: false,
    frame: false,
    useContentSize: true,
    webPreferences: { offscreen: { deviceScaleFactor: scale }, sandbox: true, contextIsolation: true },
  });
}

async function capture(win, file, expected) {
  // Let fonts, layout and the first example settle before the frame is taken.
  await new Promise((r) => setTimeout(r, 500));
  const png = (await win.webContents.capturePage()).toPNG();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, png);
  const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
  if (w !== expected.width || h !== expected.height) throw new Error(`${file} is ${w}×${h}, expected ${expected.width}×${expected.height}`);
  console.log(`${path.relative(ANDROID, file)}  ${w}×${h}`);
}

/** One of the designed pages here at width × height CSS pixels, rendered at `scale`; `query` is its search params. */
async function renderPage(page, file, width, height, scale, query = {}) {
  const [html, hash] = page.split("#");
  const win = offscreen(width, height, scale);
  await win.loadFile(path.join(STORE, html), { hash, query });
  await win.webContents.executeJavaScript("document.fonts.ready.then(() => true)");
  await capture(win, file, { width: width * scale, height: height * scale });
  win.destroy();
}

/** The built page as the app shows it on `device`, set up as the shot says. */
async function captureApp(name, device, { region, audience, recent = [], hash, scroll = 0 }) {
  const screen = DEVICES[device];
  // A number scrolls the same on every device; { phone, "tablet-7", "tablet-10" } sets each.
  const top = typeof scroll === "number" ? scroll : (scroll[device] ?? 0);
  // Windows keeps even an offscreen window within the screen's height: a taller screen is a window half the size,
  // at twice the density, with the page zoomed out to 50% so it still lays out at the device's CSS size.
  const half = screen.height > 1000 ? 2 : 1;
  const win = offscreen(screen.width / half, screen.height / half, screen.scale * half);
  const load = async (url) => {
    await win.loadURL(url);
    win.webContents.setZoomFactor(1 / half);
  };
  // The app keeps its choices in localStorage (@uom/ui/storage): set them, then open the screen afresh.
  await load("app://uom/index.html");
  await win.webContents.executeJavaScript(`localStorage.clear();
    localStorage.setItem("uom.region", ${JSON.stringify(region)});
    localStorage.setItem("uom.audience", ${JSON.stringify(audience)});
    localStorage.setItem("uom.recent", ${JSON.stringify(JSON.stringify(recent))});`);
  await load(`app://uom/index.html${hash}`);
  // A phone draws no scrollbar; Chromium on the desktop does.
  await win.webContents.insertCSS("::-webkit-scrollbar { display: none; }");
  await win.webContents.executeJavaScript(`document.documentElement.style.setProperty("--safe-area-inset-top", "${STATUS_BAR}");
    document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 300))).then(() => window.scrollTo(0, ${top}))`);
  await capture(win, path.join(BUILD, "shots", device, `${name}.png`), { width: screen.width * screen.scale, height: screen.height * screen.scale });
  win.destroy();
}

// Each image gets its own window; closing one mustn't quit before the next opens.
app.on("window-all-closed", () => {});

app.whenReady().then(async () => {
  if (!fs.existsSync(path.join(DIST, "index.html"))) throw new Error("No apps/android/dist/: run it with `npm run android:store`, which builds the page first.");
  protocol.handle("app", (request) => {
    const { pathname } = new URL(request.url);
    const file = path.normalize(path.join(DIST, decodeURIComponent(pathname === "/" ? "/index.html" : pathname)));
    if (file !== DIST && !file.startsWith(DIST + path.sep)) return new Response("Not found", { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  nativeTheme.themeSource = "light";

  await renderPage("feature.html", path.join(STORE, "feature-graphic.png"), 1024, 500, 1);

  const lister = offscreen(SHOT.width, SHOT.height);
  await lister.loadFile(path.join(STORE, "shots.html"));
  const shots = Object.entries(await lister.webContents.executeJavaScript("SHOTS"));
  lister.destroy();

  const out = path.join(STORE, "screenshots");
  fs.rmSync(out, { recursive: true, force: true });
  fs.rmSync(path.join(BUILD, "shots"), { recursive: true, force: true });
  for (const [device, screen] of Object.entries(DEVICES)) {
    for (const [i, [name, shot]] of shots.entries()) {
      await captureApp(name, device, shot);
      const file = path.join(out, device, `screenshot-${i + 1}-${name}.png`);
      await renderPage(`shots.html#${name}`, file, SHOT.width, SHOT.height, SHOT.scale, { device, width: String(screen.width) });
    }
  }
  app.quit();
}).catch((err) => {
  console.error(err);
  app.exit(1);
});
