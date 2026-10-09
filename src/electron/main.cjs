// Electron shell for the UOM converter. The page is the same static build as the website
// (dist/), served from a private app:// scheme so it gets a real origin: browser storage and
// clipboard behave exactly as on the web, and nothing can load from outside the app.

const { app, BrowserWindow, Menu, nativeTheme, net, protocol, screen, shell } = require("electron");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const DIST = path.join(__dirname, "..", "..", "dist");
const DEV_URL = "http://localhost:5173";
const isDev = process.argv.includes("--dev");

/**
 * The page's frame colours (--chrome and --text in style.css, light and dark), for the title bar
 * buttons Windows draws and for the window behind the page. theme.test.ts checks they match.
 */
const FRAME = {
  light: { chrome: "#ecebe6", text: "#1c1b19" },
  dark: { chrome: "#1b1a18", text: "#edebe6" },
};
const frame = () => (nativeTheme.shouldUseDarkColors ? FRAME.dark : FRAME.light);
const TITLE_BAR_HEIGHT = 40;

// Windows 11 22H2 (build 22621) and later draw Acrylic, a blur of whatever is behind the window,
// through the page wherever it is transparent; older Windows gets the solid frame colour instead.
const ACRYLIC = process.platform === "win32" && Number(os.release().split(".")[2]) >= 22621;
const titleBarOverlay = () => ({ color: ACRYLIC ? "#00000000" : frame().chrome, symbolColor: frame().text, height: TITLE_BAR_HEIGHT });

// ---------- Window size and position, kept between runs ----------

/** The smallest window the layout is designed for (a 1366 × 768 laptop screen). */
const MIN_SIZE = { width: 1366, height: 768 };

const stateFile = () => path.join(app.getPath("userData"), "window-state.json");

function loadWindowState() {
  try {
    const { bounds, maximized } = JSON.parse(fs.readFileSync(stateFile(), "utf8"));
    // A position on a screen that's since been unplugged would open the window out of sight.
    const onScreen = screen.getAllDisplays().some(({ workArea: a }) =>
      bounds.x < a.x + a.width && bounds.x + bounds.width > a.x && bounds.y < a.y + a.height && bounds.y + bounds.height > a.y,
    );
    return { bounds: onScreen ? bounds : { width: bounds.width, height: bounds.height }, maximized };
  } catch {
    return undefined; // First run, or an unreadable file: use the defaults.
  }
}

function saveWindowState(win) {
  try {
    fs.writeFileSync(stateFile(), JSON.stringify({ bounds: win.getNormalBounds(), maximized: win.isMaximized() }));
  } catch {
    // Not worth failing a quit over.
  }
}

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
  const state = loadWindowState();
  // Never larger than the screen it opens on: after the taskbar, or at 125-150% scaling, many
  // laptops have less room than MIN_SIZE, and a window that can't fit loses its title bar.
  const { workArea } = state?.bounds.x === undefined ? screen.getPrimaryDisplay() : screen.getDisplayMatching(state.bounds);
  const minWidth = Math.min(MIN_SIZE.width, workArea.width);
  const minHeight = Math.min(MIN_SIZE.height, workArea.height);
  const win = new BrowserWindow({
    ...state?.bounds,
    // A saved size from before the minimum grows to meet it.
    width: Math.max(minWidth, state?.bounds.width ?? MIN_SIZE.width),
    height: Math.max(minHeight, state?.bounds.height ?? Math.min(860, workArea.height)),
    minWidth,
    minHeight,
    title: app.name, // productName in package.json
    icon: path.join(__dirname, "icon.png"),
    show: false,
    // The page draws its own title bar; Windows keeps the minimize / maximize / close buttons.
    titleBarStyle: "hidden",
    titleBarOverlay: titleBarOverlay(),
    backgroundMaterial: ACRYLIC ? "acrylic" : undefined,
    // Behind the page's transparent areas, so there's no white flash while it loads.
    backgroundColor: ACRYLIC ? "#00000000" : frame().chrome,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  if (state?.maximized) win.maximize();
  win.once("ready-to-show", () => win.show());
  win.on("close", () => saveWindowState(win));

  const followTheme = () => {
    win.setTitleBarOverlay(titleBarOverlay());
    if (!ACRYLIC) win.setBackgroundColor(frame().chrome);
  };
  nativeTheme.on("updated", followTheme);
  win.on("closed", () => nativeTheme.off("updated", followTheme));

  // Right-click: the usual edit menu in text boxes, Copy on selected text.
  win.webContents.on("context-menu", (_event, p) => {
    const f = p.editFlags;
    const items = p.isEditable
      ? [
          { role: "undo", enabled: f.canUndo },
          { role: "redo", enabled: f.canRedo },
          { type: "separator" },
          { role: "cut", enabled: f.canCut },
          { role: "copy", enabled: f.canCopy },
          { role: "paste", enabled: f.canPaste },
          { type: "separator" },
          { role: "selectAll", enabled: f.canSelectAll },
        ]
      : p.selectionText.trim()
        ? [{ role: "copy" }]
        : [];
    if (items.length) Menu.buildFromTemplate(items).popup({ window: win });
  });

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
