// What only the website has: a link to the Windows app, and offline use once installed from the
// browser (sw.js, written by vite.config.ts).

export const STORE_URL = "https://apps.microsoft.com/detail/9PHZQBV736JC";

export function registerOffline(base: string) {
  // Not on localhost: a cached build there would hide the change being worked on.
  if ("serviceWorker" in navigator && location.hostname !== "localhost") {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {
      // No offline copy; the site still works online.
    });
  }
}
