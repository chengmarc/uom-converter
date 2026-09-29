import { describe, expect, it } from "vitest";
import { AUDIENCES } from "./audiences";
import { TOOLS } from "./converters";

describe("audiences", () => {
  it("only list converters that exist, once each", () => {
    const ids = new Set(TOOLS.map((t) => t.id));
    for (const a of AUDIENCES) {
      for (const id of a.tools) expect(ids.has(id), `${a.id}: ${id}`).toBe(true);
      expect(new Set(a.tools).size, a.id).toBe(a.tools.length);
    }
  });

  it("have unique ids", () => {
    const ids = AUDIENCES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
