import type { Converter } from "./model";
import { price } from "./price";
import { wirePrice } from "./wire-price";
import { multiplier } from "./multiplier";
import { margin } from "./margin";
import { packs } from "./packs";
import { reels } from "./reels";
import { surcharge } from "./surcharge";
import { awg } from "./awg";
import { mm2 } from "./mm2";
import { conduit } from "./conduit";
import { boxFillConverter } from "./box-fill";
import { ampacity } from "./ampacity";
import { conduitFillConverter } from "./conduit-fill";
import { faultRun } from "./fault-run";
import { transformer } from "./transformer";
import { generator } from "./generator";
import { serviceLoad } from "./service-load";
import { lighting } from "./lighting";
import { evCharger } from "./ev-charger";
import { pvString } from "./pv-string";
import { motorFla } from "./motor-fla";
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
  surcharge,
  awg,
  mm2,
  ampacity,
  conduit,
  conduitFillConverter,
  boxFillConverter,
  load,
  vdrop,
  serviceLoad,
  transformer,
  generator,
  pf,
  fault,
  faultRun,
  motorFla,
  motor,
  volts,
  ohm,
  energy,
  lighting,
  evCharger,
  pvString,
  fraction,
  length,
  temperature,
  power,
  light,
  torque,
  weight,
  metal,
  uomCodes,
  metricSpec,
  priceQty,
  mixup,
  packaging,
];

/** Each converter by its id (audiences.test.ts checks every id an audience lists is here). */
export const byId = new Map(TOOLS.map((t) => [t.id, t]));

/** Topics in the order of their first converter. */
export const TOPICS = [...new Set(TOOLS.map((t) => t.topic))];
