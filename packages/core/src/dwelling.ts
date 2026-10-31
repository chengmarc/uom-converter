// Service size for a single dwelling, by the NEC optional method or CEC Rule 8-200.

import { ratingAtLeast } from "./ratings";

interface DwellingLoads {
  /** Living area: ft² for the NEC, m² for the CEC (basement at 75%). */
  area: number;
  /** Watts, 0 where there's none. */
  range: number;
  airConditioning: number;
  heating: number;
  /** Tankless water heaters, pool, spa and hot tub heaters. */
  hotLoads: number;
  evCharger: number;
  /** Everything else fixed over 1,500 W, added up: dryer, water heater and so on. */
  otherLoads: number;
}

const SERVICE_VOLTS = 240;

/** The service rating for a calculated load: never under `minimum`. */
function service(watts: number, minimum: number) {
  const amps = watts / SERVICE_VOLTS;
  return { watts, amps, rating: ratingAtLeast(Math.max(amps, minimum)) };
}

/** NEC 220.82: 3 VA/ft², 4,500 VA for the small-appliance and laundry circuits, 100% of the first 10 kVA, 40% of the rest. */
export function necDwelling(l: DwellingLoads) {
  const connected = 3 * l.area + 4500 + l.range + l.hotLoads + l.evCharger + l.otherLoads;
  const general = Math.min(connected, 10000) + 0.4 * Math.max(0, connected - 10000);
  // The larger of air conditioning at 100% and space heating at 65% (three or fewer units).
  const hvac = Math.max(l.airConditioning, 0.65 * l.heating);
  return { connected, general, hvac, ...service(general + hvac, 100) };
}

/** CEC Rule 8-200(1)(a). `heatInterlocked`: the heating and cooling can't run together. */
export function cecDwelling(l: DwellingLoads, heatInterlocked: boolean, roomThermostats: boolean) {
  const basic = 5000 + 1000 * Math.ceil(Math.max(0, l.area - 90) / 90);
  const heating = roomThermostats ? Math.min(l.heating, 10000) + 0.75 * Math.max(0, l.heating - 10000) : l.heating;
  const hvac = heatInterlocked ? Math.max(heating, l.airConditioning) : heating + l.airConditioning;
  const range = l.range === 0 ? 0 : 6000 + 0.4 * Math.max(0, l.range - 12000);
  const other = l.range > 0 ? 0.25 * l.otherLoads : Math.min(l.otherLoads, 6000) + 0.25 * Math.max(0, l.otherLoads - 6000);
  const total = basic + hvac + range + l.hotLoads + l.evCharger + other;
  return { basic, hvac, range, other, ...service(total, l.area >= 80 ? 100 : 60) };
}
