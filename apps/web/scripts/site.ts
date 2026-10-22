// Where the built site goes and the address it's served from: SITE_URL (default below), whose
// path becomes Vite's base.

import { resolve } from "node:path";

export const SITE_URL = (process.env.SITE_URL ?? "https://uom-converter.com/").replace(/\/?$/, "/");
export const BASE = new URL(SITE_URL).pathname;
export const OUT = resolve(__dirname, "../dist");

/** Text made safe for an HTML attribute or element. */
export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
