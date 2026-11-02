import { describe, expect, it } from "vitest";
import { TOOLS, TOPICS } from "@uom/converters";
import { idFromPath, PAGES, topicFromPath, TOPIC_PAGES } from "../../../../apps/web/src/pages";

const ALL = [...Object.values(PAGES), ...Object.values(TOPIC_PAGES)];

describe("site pages", () => {
  it("give every converter a page, and only converters", () => {
    expect(Object.keys(PAGES).sort()).toEqual(TOOLS.map((t) => t.id).sort());
  });

  it("list the topics in the converters' order", () => {
    expect(Object.keys(TOPIC_PAGES)).toEqual(TOPICS);
  });

  it("have unique, address-safe slugs", () => {
    const slugs = ALL.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+(\/[a-z0-9-]+)?$/);
  });

  // The folder in a converter's address is its topic, and redirects assume the name after it is unique.
  it("put each converter in its topic's folder", () => {
    for (const t of TOOLS) expect(PAGES[t.id].slug.split("/")[0], t.id).toBe(TOPIC_PAGES[t.topic].slug);
    const names = TOOLS.map((t) => PAGES[t.id].slug.split("/")[1]);
    expect(new Set(names).size).toBe(names.length);
  });

  // Search results cut titles at about 60 characters and descriptions at about 160.
  it("fit in a search result", () => {
    for (const p of ALL) {
      expect(p.title.length, p.slug).toBeLessThanOrEqual(60);
      expect(p.description.length, p.slug).toBeLessThanOrEqual(160);
    }
  });

  it("are found from their address", () => {
    const vdrop = "wire-and-conduit/voltage-drop-calculator";
    expect(idFromPath(`/${vdrop}`, "/")).toBe("vdrop");
    expect(idFromPath(`/${vdrop}.html`, "/")).toBe("vdrop");
    expect(idFromPath(`/${vdrop}/`, "/")).toBe("vdrop");
    expect(idFromPath(`/uom-converter/${vdrop}`, "/uom-converter/")).toBe("vdrop");
    expect(idFromPath("/", "/")).toBeUndefined();
    expect(idFromPath(`/${vdrop}/extra`, "/")).toBeUndefined();
    expect(idFromPath(`/elsewhere/${vdrop}`, "/uom-converter/")).toBeUndefined();
    expect(idFromPath("/voltage-drop-calculator", "/")).toBeUndefined(); // the old address: a redirect, not a page
    expect(idFromPath("/electrical", "/")).toBeUndefined();
  });

  it("find their topic from a topic's address, and only that", () => {
    expect(topicFromPath("/wire-and-conduit", "/")).toBe("Wire & conduit");
    expect(topicFromPath("/power-and-loads.html", "/")).toBe("Power & loads");
    expect(topicFromPath("/wire-and-conduit/voltage-drop-calculator", "/")).toBeUndefined();
  });
});
