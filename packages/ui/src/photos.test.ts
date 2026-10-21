import { readdirSync } from "node:fs";
import { PHOTOS } from "@uom/brand/vite";
import { describe, expect, it } from "vitest";
import { TOPIC_SLOTS } from "./photos";

const files = new Set(readdirSync(PHOTOS));

describe("topic photos", () => {
  // Every topic is in TOPIC_SLOTS (its type sees to that). The Android app bundles each topic's
  // thumb at 240 and banner at 800; the website takes every size.
  it("are there for every topic, at the sizes the apps load", () => {
    for (const [topic, slot] of Object.entries(TOPIC_SLOTS)) {
      expect(files.has(`${slot}-thumb-240.webp`), `${topic}: thumb`).toBe(true);
      expect(files.has(`${slot}-banner-800.webp`), `${topic}: banner`).toBe(true);
    }
  });
});
