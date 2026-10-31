// Box fill: the volume what's in a box takes up, as the NEC and the CEC each count it.

export type BoxCode = "nec" | "cec";

/** Wire sizes the two tables have in common, smallest to largest. */
export const BOX_WIRE_SIZES = ["14", "12", "10", "8", "6"] as const;
type BoxWireSize = (typeof BOX_WIRE_SIZES)[number];

/**
 * Space for each conductor: NEC Table 314.16(B) in in³, CEC Table 22 in mL. They aren't one table
 * in two units: 14 AWG takes 2.00 in³ (32.8 mL) in the NEC and 24.6 mL in the CEC.
 */
export const CONDUCTOR_ALLOWANCE: Record<BoxCode, Record<BoxWireSize, number>> = {
  nec: { "14": 2, "12": 2.25, "10": 2.5, "8": 3, "6": 5 },
  cec: { "14": 24.6, "12": 28.7, "10": 36.9, "8": 45.1, "6": 73.7 },
};

interface BoxContents {
  /** Insulated conductors of each size entering or leaving the box. Pigtails don't count. */
  conductors: Partial<Record<BoxWireSize, number>>;
  /** Switches and receptacles: a yoke counts as two conductors. */
  devices: number;
  /** Fixture studs and hickeys: one conductor each. */
  studs: number;
  /** NEC: internal cable clamps, however many, count as one conductor. */
  clamps: boolean;
  /** NEC: grounding conductors. The CEC doesn't count bare ones; insulated ones are conductors. */
  grounds: number;
  /** CEC: insulated wire connectors count in pairs. */
  connectors: number;
}

/** NEC 314.16(B)(5) since 2020: the first four grounds share one allowance, each one after adds a quarter. */
const groundAllowances = (grounds: number) => (grounds === 0 ? 0 : 1 + Math.max(0, grounds - 4) / 4);

/**
 * The volume a box's contents take up, in the code's own unit, built from conductor allowances.
 * Devices, clamps and the rest are charged at the largest conductor present, which is what the
 * codes ask for or, for grounds and a device on a smaller wire, the safe side of it.
 * Undefined with no conductors, since there's nothing to size them by.
 */
export function boxFill(code: BoxCode, c: BoxContents) {
  const allowance = CONDUCTOR_ALLOWANCE[code];
  const present = BOX_WIRE_SIZES.filter((s) => (c.conductors[s] ?? 0) > 0);
  if (!present.length) return undefined;
  const largest = allowance[present.at(-1)!];
  const nec = code === "nec";
  const wires = present.map((size) => ({ size, count: c.conductors[size]!, volume: c.conductors[size]! * allowance[size] }));
  const others = {
    devices: c.devices * 2 * largest,
    studs: c.studs * largest,
    clamps: nec && c.clamps ? largest : 0,
    grounds: nec ? groundAllowances(c.grounds) * largest : 0,
    connectors: nec ? 0 : Math.floor(c.connectors / 2) * largest,
  };
  const total = wires.reduce((sum, w) => sum + w.volume, 0) + Object.values(others).reduce((sum, v) => sum + v, 0);
  return { wires, others, total };
}
