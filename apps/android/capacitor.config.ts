import type { CapacitorConfig } from "@capacitor/cli";

// `npm run dev:android` (scripts/dev.mjs) sets UOM_DEV_URL while it syncs: the installed app then
// loads the page from Vite's dev server, for live reload. Every other sync leaves it out, so a
// build (apk, aab) always ships its own copy of the page.
const devUrl = process.env.UOM_DEV_URL;

const config: CapacitorConfig = {
  appId: "com.uomconverter.app",
  appName: "UOM Converter",
  webDir: "dist",
  android: {
    path: "native",
    backgroundColor: "#f7f6f3",
  },
  ...(devUrl && { server: { url: devUrl, cleartext: true } }),
};

export default config;
