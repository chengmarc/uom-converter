import { describe, expect, it } from "vitest";
import { AUDIENCES, EVERYTHING } from "./audiences";
import { search } from "./search";

const ids = (query: string, audience = EVERYTHING) => search(query, audience, "us").map((t) => t.id);
const electrician = AUDIENCES.find((a) => a.id === "electrician")!;

describe("search", () => {
  it("finds a converter only when every word typed matches", () => {
    expect(ids("voltage drop")).toEqual(["vdrop"]);
    expect(ids("voltage zzz")).toEqual([]);
  });

  it("ignores case", () => {
    expect(ids("VOLTAGE DROP")).toEqual(["vdrop"]);
  });

  it("finds a converter by its description", () => {
    // "Metal price" says copper only in its description.
    expect(ids("copper")).toEqual(["metal"]);
  });

  it("lists name matches before description matches", () => {
    // Price per E/C/M is the first converter, but says wire only in its description ("Wire is
    // usually priced per M feet"); conduit, much later, is under "Wire & conduit".
    const found = ids("wire");
    expect(found.indexOf("conduit")).toBeLessThan(found.indexOf("price"));
  });

  it("lists the audience's converters first, in the audience's order", () => {
    // Wire price comes first in Everything, but isn't on the electrician's list.
    expect(ids("wire", electrician).slice(0, 5)).toEqual(["awg", "mm2", "conduit", "reels", "wire-price"]);
  });
});
