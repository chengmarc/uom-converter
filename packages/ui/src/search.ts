// Finding a converter by what you type: every word has to appear in its name, topic or id, or
// else in its description. Names and topics match in English as well as the reader's language.

import type { Region } from "@uom/core/region";
import { TOOLS } from "@uom/converters";
import { blurb, type Converter } from "@uom/converters/model";
import type { Audience } from "./audiences";
import { t } from "@uom/i18n";

/** Converters matching `query`: name matches before description matches, each in the audience's order. */
export function search(query: string, audience: Audience, region: Region): Converter[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const has = (text: string) => words.every((w) => text.toLowerCase().includes(w));
  const byName = (c: Converter) => has(`${c.title} ${t(c.title)} ${c.topic} ${t(c.topic)} ${c.id}`);
  const rank = (c: Converter) =>
    (byName(c) ? 0 : 2 * TOOLS.length) + (audience.tools.includes(c.id) ? audience.tools.indexOf(c.id) : TOOLS.length + TOOLS.indexOf(c));
  return TOOLS.filter((c) => byName(c) || has(blurb(c, region))).sort((a, b) => rank(a) - rank(b));
}
