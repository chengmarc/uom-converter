// Finding a converter by what you type: every word has to appear in its name, topic or id, or
// else in its description.

import type { Region } from "@uom/core/region";
import { TOOLS } from "@uom/converters";
import { blurb, type Converter } from "@uom/converters/model";
import type { Audience } from "./audiences";

/** Converters matching `query`: name matches before description matches, each in the audience's order. */
export function search(query: string, audience: Audience, region: Region): Converter[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const has = (text: string) => words.every((w) => text.toLowerCase().includes(w));
  const byName = (t: Converter) => has(`${t.title} ${t.topic} ${t.id}`);
  const rank = (t: Converter) =>
    (byName(t) ? 0 : 2 * TOOLS.length) + (audience.tools.includes(t.id) ? audience.tools.indexOf(t.id) : TOOLS.length + TOOLS.indexOf(t));
  return TOOLS.filter((t) => byName(t) || has(blurb(t, region))).sort((a, b) => rank(a) - rank(b));
}
