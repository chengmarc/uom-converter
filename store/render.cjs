// Renders every image derived from the app's own sources, so they never drift from it:
//   src/electron/icon.png  the desktop window, taskbar and installer icon
//   appx/                  tile and taskbar icons packed into the MSIX (electron-builder's buildResources)
//   listing/               images uploaded to Partner Center: store logo, promo and screenshots
// The icons come from src/web/app-icon.svg; screenshots from the built page.
// Run with `npm run store:assets` (builds dist/ first).

const { app, BrowserWindow, nativeTheme, net, protocol } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const ICON = fs.readFileSync(path.join(ROOT, "src", "web", "app-icon.svg"), "utf8");
const SCALES = [100, 200];

/**
 * The MSIX images Windows 11 uses: [name, width, height, share of the shorter side the icon
 * fills], at 100% and 200% (Windows scales between them). Square44x44Logo also gets the
 * taskbar's target sizes, unplated so it shows the icon's own tile, not a colour plate behind it.
 */
const TILES = [
  ["StoreLogo", 50, 50, 1],
  ["Square44x44Logo", 44, 44, 1],
  ["Square150x150Logo", 150, 150, 0.6],
  ["Wide310x150Logo", 310, 150, 0.6],
];
const TARGET_SIZES = [16, 24, 32, 48, 256];

/**
 * Partner Center screenshots after the promo (screenshot-1-promo.png, from promo.html): who,
 * where, which converter, and the theme. Each opens on its first example.
 */
const SHOTS = [
  ["2-awg", "?for=electrician&region=us#awg", "light"], // also the promo's picture
  ["3-voltage-drop", "?for=electrician&region=us#vdrop", "light"],
  ["4-price-units", "?for=distributor&region=us#price", "light"],
  ["5-kva-amps", "?for=engineer&region=eu#load", "light"],
  ["6-reels", "?for=counter&region=ca#reels", "light"],
  ["7-uom-codes", "?for=pim&region=eu#uom-codes", "light"],
  ["8-conduit-dark", "?for=electrician&region=us#conduit", "dark"],
];
/** The layout's design size (main.cjs MIN_SIZE), rendered at 2× for sharp Store images. */
const SHOT_SIZE = { width: 1366, height: 768, scale: 2 };

protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

function offscreen(width, height, scale = 1) {
  return new BrowserWindow({
    width,
    height,
    show: false,
    frame: false,
    transparent: true,
    useContentSize: true,
    webPreferences: { offscreen: { deviceScaleFactor: scale }, sandbox: true, contextIsolation: true },
  });
}

async function capture(win, file, expected, rect) {
  // Let fonts, layout and the first example settle before the frame is taken.
  await new Promise((r) => setTimeout(r, 400));
  const png = (await win.webContents.capturePage(rect)).toPNG();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, png);
  const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
  if (expected && (w !== expected.width || h !== expected.height)) throw new Error(`${file} is ${w}×${h}, expected ${expected.width}×${expected.height}`);
  console.log(`${path.relative(ROOT, file)}  ${w}×${h}`);
}

/** The icon centred on a transparent (or solid) canvas of exactly width × height pixels. */
async function renderIcon(file, width, height, share, background = "transparent") {
  // Windows keeps even offscreen windows between a minimum size and the screen's: images taller
  // than a 1080p screen are laid out at half size and rendered at 2× (they're all even sizes),
  // and tiny ones are cut from a larger window.
  const scale = Math.max(width, height) > 1000 ? 2 : 1;
  const [w, h] = [width / scale, height / scale];
  const size = Math.round(Math.min(w, h) * share);
  const html = `<!doctype html><html><body style="margin:0;width:${w}px;height:${h}px;display:grid;place-items:center;background:${background};overflow:hidden">
    <img src="data:image/svg+xml;base64,${Buffer.from(ICON).toString("base64")}" width="${size}" height="${size}"></body></html>`;
  const win = offscreen(Math.max(w, 64), Math.max(h, 64), scale);
  await win.loadURL(`data:text/html;base64,${Buffer.from(html).toString("base64")}`);
  await capture(win, file, { width, height }, { x: 0, y: 0, width: w, height: h });
  win.destroy();
}

async function renderTiles() {
  const dir = path.join(__dirname, "appx");
  fs.rmSync(dir, { recursive: true, force: true });
  for (const [name, w, h, share] of TILES) {
    for (const s of SCALES) await renderIcon(path.join(dir, `${name}.scale-${s}.png`), Math.round((w * s) / 100), Math.round((h * s) / 100), share);
  }
  for (const t of TARGET_SIZES) {
    await renderIcon(path.join(dir, `Square44x44Logo.targetsize-${t}_altform-unplated.png`), t, t, 1);
  }
}

async function renderListing() {
  const dir = path.join(__dirname, "listing");
  fs.rmSync(dir, { recursive: true, force: true });
  // Partner Center's store logos: the 1:1 app tile icon, then box art and poster art from
  // logo.html, at the larger of the two sizes Partner Center accepts for each.
  await renderIcon(path.join(dir, "store-logo-300.png"), 300, 300, 1);
  await renderPage("logo.html", path.join(dir, "box-art-2160.png"), 540, 540, 4);
  await renderPage("logo.html", path.join(dir, "poster-art-1440x2160.png"), 360, 540, 4);

  protocol.handle("app", (request) => {
    const { pathname } = new URL(request.url);
    const file = path.normalize(path.join(DIST, decodeURIComponent(pathname === "/" ? "/index.html" : pathname)));
    if (file !== DIST && !file.startsWith(DIST + path.sep)) return new Response("Not found", { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  const { width, height, scale } = SHOT_SIZE;
  for (const [name, query, theme] of SHOTS) {
    nativeTheme.themeSource = theme;
    const win = offscreen(width, height, scale);
    await win.loadURL(`app://uom/index.html${query}`);
    await capture(win, path.join(dir, `screenshot-${name}.png`), { width: width * scale, height: height * scale });
    win.destroy();
  }

  // The promo shows the AWG screenshot, so it comes last. Its converter count is read
  // from the list in converters/index.ts rather than written into the page.
  nativeTheme.themeSource = "light";
  const list = fs.readFileSync(path.join(ROOT, "src", "web", "converters", "index.ts"), "utf8");
  const count = /export const TOOLS: Converter\[\] = \[([^\]]*)\]/.exec(list)[1].split(",").filter((t) => t.trim()).length;
  await renderPage("promo.html", path.join(dir, "screenshot-1-promo.png"), width, height, scale, `document.querySelector("#count").textContent = "${count} converters"`);
}

/**
 * One of the designed pages in this folder (promo.html, logo.html) at width × height CSS pixels,
 * rendered at `scale`. Pages are laid out small and rendered large, since Windows keeps even an
 * offscreen window within the screen. `script` fills in anything the page can't know itself.
 */
async function renderPage(page, file, width, height, scale, script = "") {
  const win = offscreen(width, height, scale);
  await win.loadFile(path.join(__dirname, page));
  await win.webContents.executeJavaScript(`${script}; document.fonts.ready.then(() => true)`);
  await capture(win, file, { width: width * scale, height: height * scale });
  win.destroy();
}

// Each image gets its own window; closing one mustn't quit before the next opens.
app.on("window-all-closed", () => {});

app.whenReady().then(async () => {
  if (!fs.existsSync(path.join(DIST, "index.html"))) throw new Error("No dist/: run it with `npm run store:assets`, which builds the page first.");
  await renderIcon(path.join(ROOT, "src", "electron", "icon.png"), 1024, 1024, 1);
  await renderTiles();
  await renderListing();
  app.quit();
}).catch((err) => {
  console.error(err);
  app.exit(1);
});
