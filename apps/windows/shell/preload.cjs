// What the page tells the app's main process: the language it's in, for the native menus, and the
// theme chosen in settings, which Electron applies to the page and the window frame together.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("uomApp", {
  setLanguage: (language) => ipcRenderer.send("language", language),
  setTheme: (theme) => ipcRenderer.send("theme", theme),
});
