import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The dev script pins the port (--strictPort fails rather than moving to another one); the
// desktop shell loads that port and the page's CSP allows live reload on it.
const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
const main = readFileSync(new URL("./main.cjs", import.meta.url), "utf8");
const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");

describe("dev server port", () => {
  it("is the same in the dev script, the desktop shell and the CSP", () => {
    const port = /--port (\d+) --strictPort/.exec(pkg.scripts.dev)?.[1];
    expect(port, "npm run dev pins its port").toBeDefined();
    expect(/const DEV_URL = "http:\/\/localhost:(\d+)"/.exec(main)?.[1]).toBe(port);
    expect(/ws:\/\/localhost:(\d+)/.exec(html)?.[1]).toBe(port);
  });
});
