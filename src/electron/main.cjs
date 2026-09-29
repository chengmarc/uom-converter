// Electron shell for the UOM converter. The page is the same static build as the website
// (dist/), served from a private app:// scheme so it gets a real origin: browser storage and
// clipboard behave exactly as on the web, and nothing can load from outside the app.

const { app, BrowserWindow, Menu, nativeTheme, net, protocol, shell } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const DIST = path.join(__dirname, "..", "..", "dist");
const DEV_URL = "http://localhost:5173";
const isDev = process.argv.includes("--dev");

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function serveApp() {
  protocol.handle("app", (request) => {
    const { pathname } = new URL(request.url);
    const file = path.normalize(path.join(DIST, decodeURIComponent(pathname === "/" ? "/index.html" : pathname)));
    // Refuse anything that resolves outside the build folder.
    if (file !== DIST && !file.startsWith(DIST + path.sep)) return new Response("Not found", { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 860,
    minWidth: 420,
    minHeight: 560,
    title: "UOM Converter",
    icon: path.join(__dirname, "icon.png"),
    show: false,
    // Matches the page background, so there's no white flash while it loads.
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#141412" : "#f6f5f2",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.once("ready-to-show", () => win.show());

  // Only the app itself opens inside the window; any web link goes to the default browser.
  const own = (url) => url.startsWith("app://") || (isDev && url.startsWith(DEV_URL));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (own(url)) return;
    event.preventDefault();
    if (url.startsWith("https://")) shell.openExternal(url);
  });

  win.loadURL(isDev ? DEV_URL : "app://uom/index.html");
}

// One window is enough: a second launch focuses the running app instead.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    // A plain Edit/View menu keeps copy, paste, zoom and reload shortcuts; it stays hidden until Alt.
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        { role: "editMenu" },
        {
          label: "View",
          submenu: [
            { role: "reload" },
            { role: "resetZoom" },
            { role: "zoomIn" },
            { role: "zoomOut" },
            { type: "separator" },
            { role: "togglefullscreen" },
            ...(isDev ? [{ role: "toggleDevTools" }] : []),
          ],
        },
      ]),
    );
    if (!isDev) serveApp();
    createWindow();
  });

  app.on("window-all-closed", () => app.quit());
}
