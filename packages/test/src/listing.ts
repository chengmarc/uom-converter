// What the store listing tests share: an app's listing is Markdown and page scripts, read as text.

import { readFileSync } from "node:fs";

/** Reads files as text, with paths relative to `folder`, whatever line endings they were checked out with. */
export const reader = (folder: URL) => (file: string) => readFileSync(new URL(file, folder), "utf8").replaceAll("\r\n", "\n");

/** captions.js is a page's script; what's inside its braces is JSON. */
export function parseCaptions<T>(script: string): Record<string, T> {
  return JSON.parse(script.slice(script.indexOf("= {") + 2, script.lastIndexOf("}") + 1));
}

/** The shots in a shots.html's SHOTS, by name. */
export function shotNames(html: string) {
  const list = /const SHOTS = \{(.*?)\n {6}\};/s.exec(html)![1];
  return [...list.matchAll(/^\s*"?([\w-]+)"?: \{/gm)].map((m) => m[1]).sort();
}

/** A listing's field: the code block under its heading. */
export function field(listing: string, heading: string) {
  const found = new RegExp(`^### ${heading}\\n+\`\`\`\\n(.*?)\\n\`\`\``, "ms").exec(listing);
  if (!found) throw new Error(`No ${heading}`);
  return found[1];
}
