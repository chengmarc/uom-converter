import { describe, expect, it } from "vitest";
import { themedQuery } from "@uom/ui/theme";

describe("the theme's media queries", () => {
  const dark = "(prefers-color-scheme: dark)";

  it("leaves the system's choice to the system", () => {
    expect(themedQuery(dark, "system")).toBe(dark);
  });

  it("settles the dark condition either way", () => {
    expect(themedQuery(dark, "dark")).toBe("(min-width: 0)");
    expect(themedQuery(dark, "light")).toBe("(max-width: 0)");
  });

  it("keeps the rest of a longer query", () => {
    expect(themedQuery(`(min-width: 1180px) and ${dark}`, "dark")).toBe("(min-width: 1180px) and (min-width: 0)");
  });

  it("leaves other queries alone", () => {
    expect(themedQuery("(max-width: 640px)", "dark")).toBe("(max-width: 640px)");
  });
});
