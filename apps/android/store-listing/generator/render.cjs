// Renders Google Play's listing images from the app's own sources, so they never drift from it, one folder per language
// in dist/<language>/, in each language of captions.js:
//   icon-512.png         render-icons.cjs's, the same in every language
//   feature-graphic.png  1024 × 500, from feature.html
//   <device>-<n>-<shot>.png   phone, tablet7 and tablet10 screenshots, 1080 × 1920, in upload order: shots.html (which
//                        lists them) around captures of the built page at each device's size, taken into
//                        build/shots/<language>/<device>/
// Run with `npm run android:store`, which runs render-icons.cjs and builds apps/android/build/web/ first.

const { app, BrowserWindow, nativeTheme, net, protocol } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const ANDROID = path.join(__dirname, "..", "..");
const DIST = path.join(ANDROID, "dist");
const BUILD = path.join(ANDROID, "build");
const PAGE = path.join(BUILD, "web");

/**
 * Each device Play asks screenshots for, by its screen in CSS pixels: a common phone (393 × 852 at 3×, the
 * density of most phones today), and 7-inch and 10-inch tablets at 2×. `status` is its status bar's height, which the
 * page pads for through the inset Capacitor sets on a device. A tablet's capture is its whole screenshot, so
 * it's 9:16, as Google asks, a little taller than a real tablet's 5:8.
 */
const DEVICES = {
  phone: { width: 393, height: 852, scale: 3, status: 40 },
  tablet7: { width: 612, height: 1088, scale: 2, status: 28 },
  tablet10: { width: 810, height: 1440, scale: 2, status: 28 },
};
/** The screenshots' layout size, rendered at 3× for 1080 × 1920 (9:16). */
const SHOT = { width: 360, height: 640, scale: 3 };

/**
 * Where a phone hyphenates the longest card titles (hyphens: auto in the app's style.css). Electron has no hyphenation
 * dictionary, so its captures would cut them mid-word: they get these breaks, as soft hyphens, to show what a phone shows.
 */
const HYPHENATED = ["Spannungs-fall", "Hausan-schluss-größe", "Strombe-lastbarkeit", "Blindleistungs-kompensation", "Transforma-torauslegung", "Beleuch-tungsplanung", "Beleuch-tungsstärke", "Verpa-ckungsebenen", "Spezifi-kationswert", "Dimension-nement"];

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
  await win.loadFile(path.join(__dirname, html), { hash, query });
  await win.webContents.executeJavaScript("document.fonts.ready.then(() => true)");
  await capture(win, file, { width: width * scale, height: height * scale });
  win.destroy();
}

/** The built page as the app shows it on `device`, in `language` and `region`, set up as the shot says. */
async function captureApp(language, region, name, device, { audience, recent = [], hash, scrollTo }) {
  const screen = DEVICES[device];
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
    localStorage.setItem("uom.language", ${JSON.stringify(language)});
    localStorage.setItem("uom.region", ${JSON.stringify(region)});
    localStorage.setItem("uom.audience", ${JSON.stringify(audience)});
    localStorage.setItem("uom.recent", ${JSON.stringify(JSON.stringify(recent))});`);
  await load(`app://uom/index.html${hash}`);
  // A phone draws no scrollbar; Chromium on the desktop does.
  await win.webContents.insertCSS("::-webkit-scrollbar { display: none; }");
  await win.webContents.executeJavaScript(`for (const word of ${JSON.stringify(HYPHENATED)}) for (const e of document.querySelectorAll(".card-title")) e.textContent = e.textContent.replace(word.replaceAll("-", ""), word.replaceAll("-", "\u00ad"));`);
  // By element, not by pixels: text wraps differently in each language. Under the app bar, which stays put. Room below
  // the page, out of the shot, lets a short page scroll as far as a long one.
  const scroll = device === "phone" && scrollTo
    ? `document.querySelector("#content").style.paddingBottom = "100vh"; window.scrollTo(0, document.querySelector("${scrollTo}").getBoundingClientRect().top + scrollY - document.querySelector("#screen .appbar").offsetHeight - 12)`
    : "";
  await win.webContents.executeJavaScript(`document.documentElement.style.setProperty("--safe-area-inset-top", "${screen.status}px");
    document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 500))).then(() => { ${scroll} })`);
  await capture(win, path.join(BUILD, "shots", language, device, `${name}.png`), { width: screen.width * screen.scale, height: screen.height * screen.scale });
  win.destroy();
}

// Each image gets its own window; closing one mustn't quit before the next opens.
app.on("window-all-closed", () => {});

app.whenReady().then(async () => {
  if (!fs.existsSync(path.join(PAGE, "index.html"))) throw new Error("No apps/android/build/web/: run it with `npm run android:store`, which builds the page first.");
  protocol.handle("app", (request) => {
    const { pathname } = new URL(request.url);
    const file = path.normalize(path.join(PAGE, decodeURIComponent(pathname === "/" ? "/index.html" : pathname)));
    if (file !== PAGE && !file.startsWith(PAGE + path.sep)) return new Response("Not found", { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  nativeTheme.themeSource = "light";

  // The shots, in upload order, as shots.html lists them, and the languages, as captions.js lists them.
  const lister = offscreen(SHOT.width, SHOT.height);
  await lister.loadFile(path.join(__dirname, "shots.html"));
  const shots = Object.entries(await lister.webContents.executeJavaScript("SHOTS"));
  const captions = await lister.webContents.executeJavaScript("CAPTIONS");
  lister.destroy();

  fs.rmSync(path.join(BUILD, "shots"), { recursive: true, force: true });
  for (const [language, { region }] of Object.entries(captions)) {
    // Only the language's own folder, as dist/ also holds the .aab. Its contents, not the folder: Windows won't delete a
    // folder that's open in Explorer.
    const dir = path.join(DIST, language);
    fs.mkdirSync(dir, { recursive: true });
    for (const entry of fs.readdirSync(dir)) fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
    fs.copyFileSync(path.join(BUILD, "icon-512.png"), path.join(dir, "icon-512.png"));
    await renderPage(`feature.html#${language}`, path.join(dir, "feature-graphic.png"), 1024, 500, 1);
    for (const [device, screen] of Object.entries(DEVICES)) {
      for (const [i, [name, shot]] of shots.entries()) {
        await captureApp(language, region ?? shot.region, name, device, shot);
        const file = path.join(dir, `${device}-${i + 1}-${name}.png`);
        await renderPage(`shots.html#${language}.${name}`, file, SHOT.width, SHOT.height, SHOT.scale, { device, width: String(screen.width), status: String(screen.status) });
      }
    }
  }
  app.quit();
}).catch((err) => {
  console.error(err);
  app.exit(1);
});
