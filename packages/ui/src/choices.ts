// The two choices every app remembers between visits (storage.ts): who it's for (the audience) and
// the region, whose number style every converter then writes in. The website and the Windows app
// also take them from an address's ?for= and ?region=, which win over what was remembered.

import type { Region } from "@uom/core/region";
import { setNumberStyle } from "@uom/converters/format";
import { guessRegion, regionInfo, REGIONS } from "@uom/converters/regions";
import { ALL_AUDIENCES, EVERYTHING, type Audience } from "./audiences";
import { store, stored } from "./storage";

/** The audience to open on: the address's, else the one chosen last, else Everything. */
export function chosenAudience(params?: URLSearchParams): Audience {
  const id = params?.get("for") ?? stored("uom.audience");
  return ALL_AUDIENCES.find((a) => a.id === id) ?? EVERYTHING;
}

export function chooseAudience(a: Audience) {
  store("uom.audience", a.id);
}

/** The region to open in (the address's, else the one chosen last, else a guess), its number style applied. */
export function chosenRegion(params?: URLSearchParams): Region {
  const id = params?.get("region") ?? stored("uom.region");
  const region = REGIONS.find((r) => r.id === id)?.id ?? guessRegion();
  setNumberStyle(regionInfo(region).number);
  return region;
}

/** Remembers the region and applies its number style; the app then redraws its converters. */
export function chooseRegion(r: Region) {
  store("uom.region", r);
  setNumberStyle(regionInfo(r).number);
}
