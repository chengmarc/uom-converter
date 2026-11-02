// Renders every image derived from the app's own sources, so they never drift from it:
//   shell/icon.png         the desktop window, taskbar and installer icon
//   build/packaging/appx/  tile and taskbar icons packed into the MSIX (electron-builder's buildResources)
//   dist/<language>/       images uploaded to Partner Center, one folder per language: store logos and screenshots
//   docs/screenshots/      the README's screenshots, in English
//   docs/social-preview.png  GitHub's social preview, from social.html, which also heads the README
//   @uom/brand's rendered/ the icon at 256 and the share image (the promo shot), which the website uses too
// The icons come from @uom/brand's app-icon.svg; screenshots from the built page, captured into build/shots/ and
// framed by shots.html, in each language of captions.js.
// Run with `npm run windows:assets` (builds apps/windows/build/web/ first). With --tiles it stops after the MSIX's
// icons, which is all `npm run windows:appx` needs.

const { app, BrowserWindow, nativeTheme, net, protocol } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const WINDOWS = path.join(__dirname, "..", "..");
const DIST = path.join(WINDOWS, "dist");
const README_SHOTS = path.join(WINDOWS, "..", "..", "docs", "screenshots");
const SOCIAL_PREVIEW = path.join(WINDOWS, "..", "..", "docs", "social-preview.png");
const BUILD = path.join(WINDOWS, "build");
const PAGE = path.join(BUILD, "web");
const TILES_DIR = path.join(BUILD, "packaging", "appx");
const ICON = fs.readFileSync(require.resolve("@uom/brand/app-icon.svg"), "utf8");
const ICON_256 = require.resolve("@uom/brand/icon-256.png");
const SHARE = require.resolve("@uom/brand/share.png");
const SCALES = [100, 200];
/** The shots the README shows. */
const IN_README = ["promo", "voltage-drop", "reels"];

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
 * The Store's screenshots (shots.html, which lists the shots), rendered at 2× for sharp images, and the app inside
 * them, captured at the size its window opens at (MIN_SIZE in main.cjs; @uom/test's windows/listing.test.ts checks they match).
 */
const SHOT_SIZE = { width: 1366, height: 768, scale: 2 };
const APP_SIZE = { width: 1400, height: 860 };

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
  console.log(`${path.relative(WINDOWS, file)}  ${w}×${h}`);
}

/** The icon centred on a transparent canvas of exactly width × height pixels. */
async function renderIcon(file, width, height, share) {
  // Windows keeps even offscreen windows between a minimum size and the screen's: images taller
  // than a 1080p screen are laid out at half size and rendered at 2× (they're all even sizes),
  // and tiny ones are cut from a larger window.
  const scale = Math.max(width, height) > 1000 ? 2 : 1;
  const [w, h] = [width / scale, height / scale];
  const size = Math.round(Math.min(w, h) * share);
  const html = `<!doctype html><html><body style="margin:0;width:${w}px;height:${h}px;display:grid;place-items:center;background:transparent;overflow:hidden">
    <img src="data:image/svg+xml;base64,${Buffer.from(ICON).toString("base64")}" width="${size}" height="${size}"></body></html>`;
  const win = offscreen(Math.max(w, 64), Math.max(h, 64), scale);
  await win.loadURL(`data:text/html;base64,${Buffer.from(html).toString("base64")}`);
  await capture(win, file, { width, height }, { x: 0, y: 0, width: w, height: h });
  win.destroy();
}

async function renderTiles() {
  const dir = TILES_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
  for (const [name, w, h, share] of TILES) {
    for (const s of SCALES) await renderIcon(path.join(dir, `${name}.scale-${s}.png`), Math.round((w * s) / 100), Math.round((h * s) / 100), share);
  }
  for (const t of TARGET_SIZES) {
    await renderIcon(path.join(dir, `Square44x44Logo.targetsize-${t}_altform-unplated.png`), t, t, 1);
  }
}

async function renderListing() {
  fs.rmSync(README_SHOTS, { recursive: true, force: true });

  protocol.handle("app", (request) => {
    const { pathname } = new URL(request.url);
    const file = path.normalize(path.join(PAGE, decodeURIComponent(pathname === "/" ? "/index.html" : pathname)));
    if (file !== PAGE && !file.startsWith(PAGE + path.sep)) return new Response("Not found", { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });

  // The shots, in upload order, as shots.html lists them, and the languages, as captions.js lists them.
  const lister = offscreen(SHOT_SIZE.width, SHOT_SIZE.height);
  await lister.loadFile(path.join(__dirname, "shots.html"));
  const shots = Object.entries(await lister.webContents.executeJavaScript("SHOTS"));
  const captions = await lister.webContents.executeJavaScript("CAPTIONS");
  lister.destroy();

  // The converter count on every shot is read from the list in @uom/converters (its index.ts).
  const list = fs.readFileSync(require.resolve("@uom/converters"), "utf8");
  const count = /export const TOOLS: Converter\[\] = \[([^\]]*)\]/.exec(list)[1].split(",").filter((t) => t.trim()).length;

  fs.rmSync(path.join(BUILD, "shots"), { recursive: true, force: true });
  for (const [language, { region }] of Object.entries(captions)) {
    // Only the language's own folder: dist/ also holds the installer and the .appx.
    const dir = path.join(DIST, language);
    fs.rmSync(dir, { recursive: true, force: true });
    // Partner Center's store logos: the 1:1 app tile icon, then box art and poster art from
    // logo.html, at the larger of the two sizes Partner Center accepts for each.
    await renderIcon(path.join(dir, "store-logo-300.png"), 300, 300, 1);
    await renderPage(`logo.html#${language}`, path.join(dir, "box-art-2160.png"), 540, 540, 4);
    await renderPage(`logo.html#${language}`, path.join(dir, "poster-art-1440x2160.png"), 360, 540, 4);
    for (const [i, [name, shot]] of shots.entries()) {
      const file = path.join(dir, `screenshot-${i + 1}-${name}.png`);
      await renderShot(language, name, shot, region, file, count);
      if (language === "en") {
        if (name === "promo") fs.copyFileSync(file, SHARE);
        if (IN_README.includes(name)) {
          fs.mkdirSync(README_SHOTS, { recursive: true });
          fs.copyFileSync(file, path.join(README_SHOTS, path.basename(file)));
        }
      }
    }
  }
  // After the shots: it shows the promo shot's capture. GitHub's size, under its 1 MB limit.
  await renderPage("social.html", SOCIAL_PREVIEW, 1280, 640, 1, fillCount(count));
}

/** Fills the converter count into a page's first fact. */
const fillCount = (count) => `document.querySelector("#count").textContent = document.querySelector("#count").textContent.replace("{count}", "${count}")`;

/** One screenshot: the app captured in `language` (and `region`, over the shot's own), then framed by shots.html. */
async function renderShot(language, name, { query, theme, scrollTo }, region, file, count) {
  const { width, height, scale } = SHOT_SIZE;
  const expected = { width: APP_SIZE.width * scale, height: APP_SIZE.height * scale };
  nativeTheme.themeSource = theme;
  const page = offscreen(APP_SIZE.width, APP_SIZE.height, scale);
  // In this language whatever this machine's: the app would otherwise follow it.
  const opens = region ? query.replace(/region=\w+/, `region=${region}`) : query;
  await page.loadURL(`app://uom/index.html${opens.replace("?", `?lang=${language}&`)}`);
  // Chromium saves zoom by host, and the Android render, sharing this Electron profile, leaves app://uom at 50%.
  page.webContents.setZoomFactor(1);
  // As in the real window (main.cjs): the frame is translucent over Windows 11's Acrylic, which shots.html draws.
  await page.webContents.executeJavaScript(`document.documentElement.classList.add("desktop")`);
  // By element, not by pixels: text wraps differently in each language. Waits out the page's ease-in, which moves it.
  if (scrollTo) await page.webContents.executeJavaScript(`new Promise((r) => setTimeout(r, 400)).then(() => {
    const content = document.querySelector("#content");
    content.scrollTop += content.querySelector(":scope > :not([hidden]) ${scrollTo}").getBoundingClientRect().top - content.getBoundingClientRect().top - 12;
  })`);
  await capture(page, path.join(BUILD, "shots", language, `${name}.png`), expected);
  page.destroy();
  await renderPage(`shots.html#${language}.${name}`, file, width, height, scale, fillCount(count));
}

/**
 * One of the designed pages in this folder (shots.html, logo.html) at width × height CSS pixels,
 * rendered at `scale`. Pages are laid out small and rendered large, since Windows keeps even an
 * offscreen window within the screen. `script` fills in anything the page can't know itself.
 */
async function renderPage(page, file, width, height, scale, script = "") {
  const [html, hash] = page.split("#");
  const win = offscreen(width, height, scale);
  await win.loadFile(path.join(__dirname, html), { hash });
  await win.webContents.executeJavaScript(`${script}; document.fonts.ready.then(() => true)`);
  await capture(win, file, { width: width * scale, height: height * scale });
  win.destroy();
}

// Each image gets its own window; closing one mustn't quit before the next opens.
app.on("window-all-closed", () => {});

app.whenReady().then(async () => {
  if (!fs.existsSync(path.join(PAGE, "index.html"))) throw new Error("No apps/windows/build/web/: run it with `npm run windows:assets`, which builds the page first.");
  await renderTiles();
  if (process.argv.includes("--tiles")) return app.quit();
  fs.copyFileSync(path.join(TILES_DIR, "Square44x44Logo.targetsize-256_altform-unplated.png"), ICON_256);
  await renderIcon(path.join(WINDOWS, "shell", "icon.png"), 1024, 1024, 1);
  await renderListing();
  app.quit();
}).catch((err) => {
  console.error(err);
  app.exit(1);
});
