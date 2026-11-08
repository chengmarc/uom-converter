// What only the website has: its name, links to the Windows and Android apps, and offline use once installed
// from the browser (sw.js, written by scripts/offline.ts). The build reads the name and links too.

export const NAME = "UOM Converter";
export const STORE_URL = "https://apps.microsoft.com/detail/9PHZQBV736JC";
export const PLAY_URL = "https://play.google.com/store/apps/details?id=com.chengmarc.uomconverter";
/** The installer, always the latest release's. */
export const EXE_URL = "https://github.com/chengmarc/uom-converter/releases/latest/download/UOM-Converter-setup.exe";

export function registerOffline(base: string) {
  // Not on localhost: a cached build there would hide the change being worked on.
  if ("serviceWorker" in navigator && location.hostname !== "localhost") {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {
      // No offline copy; the site still works online.
    });
  }
}
