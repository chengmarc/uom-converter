import type { CapacitorConfig } from "@capacitor/cli";

// `npm run android:dev` (scripts/dev.mjs) sets UOM_DEV_URL while it syncs: the installed app then
// loads the page from Vite's dev server, for live reload. Every other sync leaves it out, so a
// build (apk, aab) always ships its own copy of the page.
const devUrl = process.env.UOM_DEV_URL;

const config: CapacitorConfig = {
  appId: "com.chengmarc.uomconverter",
  appName: "UOM Converter",
  webDir: "build/web",
  android: {
    path: "native",
    backgroundColor: "#f6f7f9",
  },
  ...(devUrl && { server: { url: devUrl, cleartext: true } }),
};

export default config;
