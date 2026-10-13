// The website gives every converter its own address, so a search for "voltage drop calculator"
// can land on that converter, and every topic has a page listing its converters. Each page's
// title and description are written for search: the words people type, not the app's short
// sidebar names. The desktop app doesn't use any of this.

import type { Topic } from "@uom/converters/model";

export interface Page {
  /** The page's address on the site: /<slug> (served from <slug>.html). */
  slug: string;
  /** The browser tab and search result title, before " | UOM Converter". */
  title: string;
  /** The search result snippet: what you can work out here, in about 150 characters. */
  description: string;
}

/** By converter id. pages.test.ts checks every converter has a page and slugs are unique. */
export const PAGES: Record<string, Page> = {
  price: {
    slug: "price-per-each-c-m",
    title: "Price per Each, C and M Converter (E/C/M)",
    description: "Convert distributor prices between per each (E), per 100 (C) and per 1,000 (M). Wire is usually priced per M feet. Free, works offline.",
  },
  "wire-price": {
    slug: "wire-price-per-foot-metre",
    title: "Wire Price per Foot to per Metre Converter",
    description: "Convert wire prices per foot, per 100 ft (C), per 1,000 ft (M), per metre and per km. Free, works offline.",
  },
  multiplier: {
    slug: "list-price-multiplier-discount",
    title: "List Price Multiplier and Discount Chain Calculator",
    description: "Net price from list price and multiplier. Chained discounts like 50/10 worked out, with the equivalent single discount.",
  },
  margin: {
    slug: "margin-markup-calculator",
    title: "Margin to Markup Calculator",
    description: "Convert gross margin to markup and back, and get the sell price from cost. 25% margin = 33.3% markup. Free, works offline.",
  },
  packs: {
    slug: "boxes-packs-calculator",
    title: "Boxes and Packs Order Calculator",
    description: "How many boxes or packs to order for a quantity, and price per each to per pack and back.",
  },
  reels: {
    slug: "wire-reels-coils-calculator",
    title: "Wire Reels and Coils Calculator",
    description: "How many coils or reels of wire a run needs, counting every conductor pulled. Three wires pulled 200 ft is 600 ft of wire.",
  },
  awg: {
    slug: "awg-to-mm2",
    title: "AWG and kcmil to mm² Converter",
    description: "Convert American wire gauge (AWG) and kcmil to mm², with solid-conductor diameter and the matching IEC 60228 metric wire size.",
  },
  mm2: {
    slug: "mm2-to-awg",
    title: "mm² to AWG and kcmil Converter",
    description: "Convert metric wire sizes in mm² to the matching North American AWG or kcmil building-wire size.",
  },
  conduit: {
    slug: "conduit-trade-size-knockout",
    title: "Conduit Trade Size to Metric and Knockout Size",
    description: "Conduit inch trade size to metric designator, with the typical knockout punch diameter for each size.",
  },
  load: {
    slug: "kva-kw-amps-calculator",
    title: "kVA, kW and Amps Calculator (Single and Three-Phase)",
    description: "Convert kVA, kW and amps for transformers, generators and UPS sizing, single-phase or three-phase, with the formula shown.",
  },
  vdrop: {
    slug: "voltage-drop-calculator",
    title: "Voltage Drop Calculator (AWG and mm²)",
    description: "Voltage drop on a run in AWG, kcmil or mm², copper or aluminum, and the smallest wire size that keeps it within 3%. NEC, CEC and IEC notes.",
  },
  pf: {
    slug: "power-factor-correction-calculator",
    title: "Power Factor Correction Capacitor Calculator (kvar)",
    description: "Capacitor kvar needed to raise a load's power factor, and how much it cuts kVA and current.",
  },
  fault: {
    slug: "transformer-fault-current-calculator",
    title: "Transformer Fault Current Calculator",
    description: "Full-load current and maximum available fault current at a transformer's secondary, from kVA and nameplate impedance (%Z).",
  },
  motor: {
    slug: "motor-speed-slip-calculator",
    title: "Motor Synchronous Speed and Slip Calculator",
    description: "Synchronous speed from frequency and poles, slip from nameplate RPM, and the same motor at 50 Hz or 60 Hz.",
  },
  volts: {
    slug: "line-to-neutral-voltage",
    title: "Line-to-Line to Line-to-Neutral Voltage Calculator",
    description: "Three-phase wye voltages: line-to-neutral = line-to-line ÷ √3. 208/120, 480/277, 600/347, 400/230 V.",
  },
  ohm: {
    slug: "ohms-law-calculator",
    title: "Ohm's Law Calculator (Volts, Amps, Ohms, Watts)",
    description: "Enter any two of volts, amps, ohms and watts to get the other two, with the formula shown.",
  },
  energy: {
    slug: "energy-cost-calculator",
    title: "Electricity Cost and Retrofit Savings Calculator",
    description: "What a load costs to run per day, month and year, and what a lighting or motor retrofit saves.",
  },
  fraction: {
    slug: "fraction-inch-to-mm",
    title: "Fraction of an Inch to Decimal and mm Converter",
    description: "Fractional inches to decimal inches and millimetres, and back. For drill bits, knockout punches and enclosure sizes.",
  },
  length: {
    slug: "feet-to-metres",
    title: "Feet to Metres and Inches to mm Converter",
    description: "Convert feet to metres and inches to millimetres, and back. 1 ft = 0.3048 m, 1 in = 25.4 mm. Free, works offline.",
  },
  temperature: {
    slug: "celsius-to-fahrenheit",
    title: "Celsius to Fahrenheit Converter (60/75/90 °C Ratings)",
    description: "Convert °C and °F, including the 60, 75 and 90 °C conductor insulation and termination ratings.",
  },
  power: {
    slug: "hp-to-kw",
    title: "Horsepower to kW and BTU/h Converter",
    description: "Convert horsepower, kilowatts, watts and BTU per hour for motors and electric heat.",
  },
  light: {
    slug: "foot-candles-to-lux",
    title: "Foot-Candles to Lux Converter",
    description: "Convert foot-candles (fc) to lux (lx) and back, for lighting levels. 1 fc = 10.764 lx. Free, works offline.",
  },
  torque: {
    slug: "torque-lb-in-to-nm",
    title: "Torque Converter: lb-in, lb-ft and N·m",
    description: "Convert lug and breaker termination torque between inch-pounds, foot-pounds and newton-metres.",
  },
  weight: {
    slug: "pounds-to-kg",
    title: "Pounds to Kilograms Converter",
    description: "Convert pounds (lb) to kilograms (kg) and back. 1 kg = 2.2046 lb, 1 lb = 0.4536 kg. Free, works offline.",
  },
  metal: {
    slug: "copper-price-per-lb-to-kg",
    title: "Copper and Aluminum Price per lb to per kg",
    description: "Convert copper and aluminum prices per pound to per kilogram and back, for metal surcharges on wire and cable.",
  },
  volume: {
    slug: "box-fill-cubic-inches-to-ml",
    title: "Box Fill Volume: Cubic Inches to mL",
    description: "Convert box fill volume between cubic inches (NEC) and millilitres (CEC).",
  },
  "uom-codes": {
    slug: "uom-codes-un-ece",
    title: "UOM Codes: UN/ECE Recommendation 20 Lookup",
    description: "Look up the UN/ECE Rec 20 unit code for a unit as written in a supplier file or ERP (EA, FT, BX, LBS…), for BMEcat, ETIM and e-invoicing.",
  },
  metric: {
    slug: "etim-metric-spec-values",
    title: "Spec Values to Metric for ETIM",
    description: "Convert a product spec as the supplier wrote it, with its unit, to the metric value and unit code ETIM features take.",
  },
  "price-qty": {
    slug: "price-quantity-to-unit-price",
    title: "Price Quantity to Unit Price Calculator",
    description: "Unit price from a price file's price, price quantity, order unit and content units, as in BMEcat and ETIM price data.",
  },
  mixup: {
    slug: "uom-price-mix-up-check",
    title: "UOM Price Mix-Up Check",
    description: "Compare one item's price from two sources. About 10×, 100× or 1,000× apart usually means one was loaded in the wrong unit of measure.",
  },
  packaging: {
    slug: "packaging-levels-gtin-14",
    title: "Packaging Levels and GTIN-14 Calculator",
    description: "Each, inner pack, case and pallet quantities, with GTIN-14s for each pack level built from the item GTIN.",
  },
};

/** A topic's page: its converters, with an introduction. */
export interface TopicPage extends Page {
  /** The page's heading: what the topic's converters are, in the words people search for. */
  heading: string;
  /** What the topic covers and who it's for, in two or three sentences. */
  intro: string;
}

/** By topic, in the order the converters list them. pages.test.ts checks every topic has one. */
export const TOPIC_PAGES: Record<Topic, TopicPage> = {
  Pricing: {
    slug: "pricing",
    title: "Electrical Pricing: E/C/M, Multiplier and Margin Tools",
    description:
      "Calculators for electrical distribution pricing: E/C/M price units, wire price per foot or metre, list × multiplier, margin and markup, packs and reels.",
    heading: "Pricing calculators",
    intro:
      "Electrical distributors quote prices per each (E), per 100 (C) or per 1,000 (M), and wire is usually priced per M feet. These calculators convert between those units, work out net prices from list price and multiplier, and turn margin into markup. They also count the boxes, packs, coils and reels an order needs.",
  },
  "Wire & conduit": {
    slug: "wire-and-conduit",
    title: "Wire Size and Conduit Converters: AWG, mm², Trade Size",
    description:
      "Convert AWG and kcmil wire sizes to mm² and back, and conduit trade sizes to metric designators with their knockout punch sizes.",
    heading: "Wire size and conduit converters",
    intro:
      "North America sizes wire in AWG and kcmil; most of the world uses mm² (IEC 60228). These converters match one to the other, with the conductor's area, diameter and weight. Conduit inch trade sizes pair with metric designators, each with its typical knockout punch size.",
  },
  Electrical: {
    slug: "electrical",
    title: "Electrical Calculators: Voltage Drop, kVA, Ohm's Law",
    description:
      "Electrical calculators: kVA and amps, voltage drop, power factor, transformer fault current, motor slip, line-to-neutral voltage, Ohm's law, energy cost.",
    heading: "Electrical calculators",
    intro:
      "Calculators for sizing and checking circuits and equipment: kVA, kW and amps on single- and three-phase systems, voltage drop and the wire size that keeps it within limits, power factor correction, transformer fault current, motor speed and slip, line-to-neutral voltage, Ohm's law and running cost. Each shows how it's calculated.",
  },
  Units: {
    slug: "units",
    title: "Unit Converters: Length, Torque, Power, Temperature",
    description:
      "Unit converters for the electrical trade: feet to metres, inch fractions to mm, °C to °F, hp to kW, foot-candles to lux, torque, weight and box fill.",
    heading: "Unit converters",
    intro:
      "Conversions between US customary and metric units, with the values the trade uses: 60, 75 and 90 °C insulation ratings, lug and breaker torque, box fill in cubic inches (NEC) or millilitres (CEC), and copper and aluminum prices per pound or kilogram. Most have a table of common values.",
  },
  "Product data": {
    slug: "product-data",
    title: "Product Data Tools: UOM Codes, ETIM, GTIN-14",
    description:
      "Tools for electrical product data: UN/ECE Rec 20 UOM codes, spec values to metric for ETIM, unit prices from price quantities, UOM mix-ups and GTIN-14s.",
    heading: "Product data tools",
    intro:
      "For the teams who load supplier files into an ERP, PIM or webshop: look up UN/ECE Recommendation 20 unit codes, convert spec values to the metric units ETIM features take, get unit prices from BMEcat-style price quantities, catch prices loaded in the wrong unit of measure, and build GTIN-14s for each packaging level.",
  },
};

export const HOME: Page = {
  slug: "",
  title: "Electrical Converter: Wire Size, Voltage Drop, Pricing",
  description:
    "Free converters for the electrical trade: AWG to mm², voltage drop, conduit, kVA and amps, price per E/C/M, margins and UOM codes. US, Canada and Europe.",
};

/** The converter a site path opens, if any: "/voltage-drop-calculator" → "vdrop". */
export function idFromPath(path: string, base: string): string | undefined {
  const slug = slugOf(path, base);
  return Object.keys(PAGES).find((id) => PAGES[id].slug === slug);
}

/** The topic a site path opens, if any: "/electrical" → "Electrical". */
export function topicFromPath(path: string, base: string): Topic | undefined {
  const slug = slugOf(path, base);
  return (Object.keys(TOPIC_PAGES) as Topic[]).find((t) => TOPIC_PAGES[t].slug === slug);
}

/** A site path's slug: "/voltage-drop-calculator" → "voltage-drop-calculator". */
function slugOf(path: string, base: string): string {
  // The host redirects /<slug>.html and /<slug>/ to /<slug>, but a copy saved offline may not.
  return path.startsWith(base) ? path.slice(base.length).replace(/(\.html|\/)$/, "") : "";
}
