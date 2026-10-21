import { describe, expect, it } from "vitest";
import { TOOLS, TOPICS } from "@uom/converters";
import { idFromPath, PAGES, topicFromPath, TOPIC_PAGES } from "./pages";

const ALL = [...Object.values(PAGES), ...Object.values(TOPIC_PAGES)];

describe("site pages", () => {
  it("give every converter a page, and only converters", () => {
    expect(Object.keys(PAGES).sort()).toEqual(TOOLS.map((t) => t.id).sort());
  });

  it("give every topic a page, and only topics", () => {
    expect(Object.keys(TOPIC_PAGES).sort()).toEqual([...TOPICS].sort());
  });

  it("have unique, address-safe slugs", () => {
    const slugs = ALL.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  // Search results cut titles at about 60 characters and descriptions at about 160.
  it("fit in a search result", () => {
    for (const p of ALL) {
      expect(p.title.length, p.slug).toBeLessThanOrEqual(60);
      expect(p.description.length, p.slug).toBeLessThanOrEqual(160);
    }
  });

  it("are found from their address", () => {
    expect(idFromPath("/voltage-drop-calculator", "/")).toBe("vdrop");
    expect(idFromPath("/voltage-drop-calculator.html", "/")).toBe("vdrop");
    expect(idFromPath("/voltage-drop-calculator/", "/")).toBe("vdrop");
    expect(idFromPath("/uom-converter/voltage-drop-calculator", "/uom-converter/")).toBe("vdrop");
    expect(idFromPath("/", "/")).toBeUndefined();
    expect(idFromPath("/voltage-drop-calculator/extra", "/")).toBeUndefined();
    expect(idFromPath("/elsewhere/voltage-drop-calculator", "/uom-converter/")).toBeUndefined();
    expect(topicFromPath("/wire-and-conduit", "/")).toBe("Wire & conduit");
    expect(topicFromPath("/electrical.html", "/")).toBe("Electrical");
    expect(topicFromPath("/voltage-drop-calculator", "/")).toBeUndefined();
    expect(idFromPath("/electrical", "/")).toBeUndefined();
  });
});
