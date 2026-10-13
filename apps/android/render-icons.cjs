// Renders the Android app's icons from @uom/brand's app-icon.svg, so they never drift from it:
//   native/app/src/main/res/mipmap-*/    launcher icons at each screen density:
//     ic_launcher_background / _foreground   the adaptive icon's layers: the tile's gradient, and
//                                            the arrows and bolt (each launcher cuts its own shape)
//     ic_launcher_monochrome                 the glyph alone, for Android 13's themed icons
//     ic_launcher, ic_launcher_round         whole icons for launchers without adaptive icons
//   store/icon-512.png                       the Play listing icon (Play rounds the corners itself)
// Run with `npm run android:icons`.

const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const RES = path.join(__dirname, "native", "app", "src", "main", "res");
const ICON = fs.readFileSync(require.resolve("@uom/brand/app-icon.svg"), "utf8");
// The tile's squircle, gradients, glyph and the glyph's drop shadow.
const DEFS = /<defs>[\s\S]*<\/defs>/.exec(ICON)[0];

/** Density buckets: mdpi is 1×, a 48dp launcher icon and a 108dp adaptive layer. */
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

const svg = (viewBox, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${DEFS}${body}</svg>`;
const GLYPH = `<use href="#glyph" filter="url(#lift)"/><use href="#glyph"/>`;
const TILE = `<rect width="1024" height="1024" fill="url(#background)"/>`;
const SHEEN = `<rect width="1024" height="1024" fill="url(#sheen)"/>`;

// Adaptive layers are 108dp, of which launchers show about the middle 72dp: the 1024-unit tile
// maps onto that middle, so the glyph sits as large as on the tile, inside the 66dp safe zone.
const LAYER = "-256 -256 1536 1536";
const IMAGES = {
  background: svg(LAYER, `<rect x="-256" y="-256" width="1536" height="1536" fill="url(#background)"/>${SHEEN}`),
  foreground: svg(LAYER, GLYPH),
  // Only the shape counts: the launcher tints it.
  monochrome: svg(LAYER, `<use href="#glyph"/>`),
  legacy: ICON,
  round: svg("0 0 1024 1024", `<clipPath id="disc"><circle cx="512" cy="512" r="512"/></clipPath><g clip-path="url(#disc)">${TILE}${GLYPH}${SHEEN}</g>`),
  // Full-bleed square: Play applies its own corner radius and shadow.
  store: svg("0 0 1024 1024", `${TILE}${GLYPH}${SHEEN}`),
};

async function render(name, file, size) {
  // Windows keeps offscreen windows at least ~64px, so small icons are cut from a larger window.
  const box = Math.max(size, 64);
  const win = new BrowserWindow({
    width: box,
    height: box,
    show: false,
    frame: false,
    transparent: true,
    useContentSize: true,
    webPreferences: { offscreen: { deviceScaleFactor: 1 }, sandbox: true, contextIsolation: true },
  });
  const html = `<!doctype html><html><body style="margin:0;background:transparent;overflow:hidden">
    <img src="data:image/svg+xml;base64,${Buffer.from(IMAGES[name]).toString("base64")}" width="${size}" height="${size}" style="display:block"></body></html>`;
  await win.loadURL(`data:text/html;base64,${Buffer.from(html).toString("base64")}`);
  await new Promise((r) => setTimeout(r, 300));
  const png = (await win.webContents.capturePage({ x: 0, y: 0, width: size, height: size })).toPNG();
  win.destroy();
  const w = png.readUInt32BE(16);
  if (w !== size) throw new Error(`${file} is ${w}px wide, expected ${size}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, png);
  console.log(`${path.relative(__dirname, file)}  ${size}×${size}`);
}

// Each icon closes its window before the next opens; that mustn't end the app.
app.on("window-all-closed", () => {});

app.whenReady().then(async () => {
  try {
    for (const [density, x] of Object.entries(DENSITIES)) {
      const dir = path.join(RES, `mipmap-${density}`);
      for (const layer of ["background", "foreground", "monochrome"]) await render(layer, path.join(dir, `ic_launcher_${layer}.png`), 108 * x);
      await render("legacy", path.join(dir, "ic_launcher.png"), 48 * x);
      await render("round", path.join(dir, "ic_launcher_round.png"), 48 * x);
    }
    await render("store", path.join(__dirname, "store", "icon-512.png"), 512);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
  app.quit();
});
