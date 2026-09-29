import type { Converter } from "../ui";
import { price } from "./price";
import { wirePrice } from "./wire-price";
import { multiplier } from "./multiplier";
import { margin } from "./margin";
import { packs } from "./packs";
import { reels } from "./reels";
import { awg } from "./awg";
import { mm2 } from "./mm2";
import { conduit } from "./conduit";
import { load } from "./load";
import { vdrop } from "./vdrop";
import { pf } from "./pf";
import { fault } from "./fault";
import { motor } from "./motor";
import { volts } from "./volts";
import { ohm } from "./ohm";
import { energy } from "./energy";
import { fraction } from "./fraction";
import { length } from "./length";
import { temperature } from "./temperature";
import { power } from "./power";
import { light } from "./light";
import { torque } from "./torque";
import { weight } from "./weight";
import { metal } from "./metal";
import { volume } from "./volume";
import { uomCodes } from "./uom-codes";
import { metricSpec } from "./metric";
import { priceQty } from "./price-qty";
import { mixup } from "./mixup";
import { packaging } from "./packaging";

/** Every converter, in display order: the "Everything" view groups topics by their first converter. */
export const TOOLS: Converter[] = [
  price,
  wirePrice,
  multiplier,
  margin,
  packs,
  reels,
  awg,
  mm2,
  conduit,
  load,
  vdrop,
  pf,
  fault,
  motor,
  volts,
  ohm,
  energy,
  fraction,
  length,
  temperature,
  power,
  light,
  torque,
  weight,
  metal,
  volume,
  uomCodes,
  metricSpec,
  priceQty,
  mixup,
  packaging,
];
