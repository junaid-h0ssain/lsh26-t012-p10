// Bangladesh residential prepaid tariff (typical BPDB / DESCO)
// Slabs are incremental within calendar month.
export const slabs = [
  { upTo: 75, rate: 4.85 },
  { upTo: 200, rate: 6.63 },
  { upTo: 300, rate: 7.20 },
  { upTo: 400, rate: 7.59 },
  { upTo: 600, rate: 8.02 },
  { upTo: Infinity, rate: 10.42 },
];
export const DEMAND_CHARGE = 42; // BDT per kW per month (assume 1kW)
export const METER_RENT = 40;
export const VAT_RATE = 0.05;

export function energyCostForUnits(units: number, cumBefore: number): number {
  let remaining = units;
  let cum = cumBefore;
  let cost = 0;
  for (const s of slabs) {
    if (remaining <= 0) break;
    const slabRemaining = Math.max(0, s.upTo - cum);
    const take = Math.min(remaining, slabRemaining);
    cost += take * s.rate;
    remaining -= take;
    cum += take;
  }
  // if still remaining beyond last slab (Infinity handles)
  return cost;
}
export function baseRate(): number { return slabs[0].rate }
