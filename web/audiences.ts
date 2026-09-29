// Who the page serves. Each audience lists converter ids in priority order; the sidebar keeps
// that order, and the buttons follow the order of this list. Adding an audience is a data change
// here, nothing else.

export interface Audience {
  id: string;
  label: string;
  description: string;
  tools: string[];
}

export const AUDIENCES: Audience[] = [
  {
    id: "supplier",
    label: "Supplier",
    description: "Manufacturers' product and sales teams: packaging, price files, spec sheets for every market.",
    tools: ["packaging", "price-qty", "wire-price", "multiplier", "uom-codes", "metric", "awg", "mm2", "conduit", "fraction", "load", "volts", "ohm", "energy", "metal", "length", "temperature", "power", "light", "torque", "weight", "volume"],
  },
  {
    id: "distributor",
    label: "Distributor",
    description: "Purchasing, pricing and inside sales: price units, multipliers, margins, metal prices.",
    tools: ["price", "wire-price", "multiplier", "margin", "mixup", "price-qty", "packs", "reels", "awg", "metal", "uom-codes", "weight", "length"],
  },
  {
    id: "counter",
    label: "Counter staff",
    description: "Quick answers at the branch counter: packs, reels, wire and conduit sizes, prices.",
    tools: ["price", "packs", "reels", "multiplier", "margin", "awg", "mm2", "conduit", "fraction", "load", "volts", "ohm", "energy", "length", "temperature", "power", "light", "torque", "weight", "volume"],
  },
  {
    id: "electrician",
    label: "Electrician / contractor",
    description: "On the job: voltage drop, wire and conduit sizes, fractions, torque, how much wire to buy.",
    tools: ["vdrop", "awg", "mm2", "conduit", "fraction", "ohm", "volts", "load", "reels", "torque", "motor", "temperature", "length", "energy", "packs", "multiplier", "volume"],
  },
  {
    id: "engineer",
    label: "Electrical engineer",
    description: "Design checks: loads, voltage drop, power factor correction, fault current, motors.",
    tools: ["load", "vdrop", "pf", "fault", "motor", "volts", "ohm", "awg", "mm2", "conduit", "energy", "power", "light", "temperature", "length", "torque", "weight", "fraction"],
  },
  {
    id: "pim",
    label: "PIM / data",
    description: "Product information teams: UOM codes, metric spec values for ETIM, price quantities, packaging.",
    tools: ["uom-codes", "metric", "price-qty", "price", "wire-price", "mixup", "packaging", "packs", "awg", "mm2", "conduit", "fraction", "length", "temperature", "torque", "weight", "volume", "light", "power"],
  },
];
