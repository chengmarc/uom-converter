import { describe, expect, it } from "vitest";
import { TOOLS } from "./converters";
import { idFromPath, PAGES } from "./pages";

describe("site pages", () => {
  it("give every converter a page, and only converters", () => {
    expect(Object.keys(PAGES).sort()).toEqual(TOOLS.map((t) => t.id).sort());
  });

  it("have unique, address-safe slugs", () => {
    const slugs = Object.values(PAGES).map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  // Search results cut titles at about 60 characters and descriptions at about 160.
  it("fit in a search result", () => {
    for (const [id, p] of Object.entries(PAGES)) {
      expect(p.title.length, id).toBeLessThanOrEqual(60);
      expect(p.description.length, id).toBeLessThanOrEqual(160);
    }
  });

  it("are found from their address", () => {
    expect(idFromPath("/uom-converter/voltage-drop-calculator/", "/uom-converter/")).toBe("vdrop");
    expect(idFromPath("/uom-converter/voltage-drop-calculator/index.html", "/uom-converter/")).toBe("vdrop");
    expect(idFromPath("/voltage-drop-calculator", "/")).toBe("vdrop");
    expect(idFromPath("/uom-converter/", "/uom-converter/")).toBeUndefined();
    expect(idFromPath("/elsewhere/voltage-drop-calculator/", "/uom-converter/")).toBeUndefined();
  });
});
