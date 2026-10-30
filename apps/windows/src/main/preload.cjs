// The one thing the page tells the app's main process: the language it's in, for the native menus.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("uomApp", {
  setLanguage: (language) => ipcRenderer.send("language", language),
});
