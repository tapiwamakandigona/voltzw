import tariffs from "@/data/tariffs.json";

export type Band = {
  from: number;
  to: number | null;
  label: string;
  baseZwg: number;
  inclLevyZwg: number;
  usdApprox: number;
};

export type BandSlice = {
  band: Band;
  units: number;
  costZwg: number;
};

export const TARIFFS = tariffs;
export const BANDS = tariffs.bands as Band[];
export const MONTHLY_QUOTA = tariffs.monthlyQuotaKwh;

/** Sane ceiling for user-supplied amounts/units — far beyond any real
 *  purchase. Huge-but-finite values clamp here so they can't distort the
 *  band math or render "∞". (1e400-style literals overflow to Infinity in
 *  JS and are treated as invalid → 0, not clamped.) */
export const MAX_INPUT = 1_000_000_000;

/** NaN/±Infinity → 0, zero/negatives → 0, huge-but-finite → MAX_INPUT. */
function sanitize(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, MAX_INPUT);
}

/** Total ZWG cost (incl REA levy) to buy `units` kWh, given `alreadyBought`
 *  units purchased earlier this calendar month. */
export function costForUnits(units: number, alreadyBought = 0): { totalZwg: number; slices: BandSlice[] } {
  let remaining = sanitize(units);
  let position = sanitize(alreadyBought); // units consumed from the stepped ladder
  const slices: BandSlice[] = [];
  let totalZwg = 0;

  for (const band of BANDS) {
    if (remaining <= 0) break;
    const bandStart = band.from - 1; // 0-indexed position where band begins
    const bandEnd = band.to ?? Infinity; // position where band ends
    if (position >= bandEnd) continue;
    const start = Math.max(position, bandStart);
    const available = bandEnd - start;
    const take = Math.min(remaining, available);
    if (take <= 0) continue;
    const cost = take * band.inclLevyZwg;
    slices.push({ band, units: take, costZwg: cost });
    totalZwg += cost;
    remaining -= take;
    position = start + take;
  }
  return { totalZwg, slices };
}

/** How many kWh `amountZwg` buys (incl REA levy), given `alreadyBought`
 *  units purchased earlier this calendar month. */
export function unitsForAmount(amountZwg: number, alreadyBought = 0): { totalUnits: number; slices: BandSlice[] } {
  let budget = sanitize(amountZwg);
  let position = sanitize(alreadyBought);
  const slices: BandSlice[] = [];
  let totalUnits = 0;

  for (const band of BANDS) {
    if (budget <= 0.0001) break;
    const bandStart = band.from - 1;
    const bandEnd = band.to ?? Infinity;
    if (position >= bandEnd) continue;
    const start = Math.max(position, bandStart);
    const available = bandEnd - start;
    const affordable = budget / band.inclLevyZwg;
    const take = Math.min(available, affordable);
    if (take <= 0) continue;
    const cost = take * band.inclLevyZwg;
    slices.push({ band, units: take, costZwg: cost });
    totalUnits += take;
    budget -= cost;
    position = start + take;
  }
  return { totalUnits, slices };
}

/** Cost of the remaining discounted quota (up to 400 kWh) from `alreadyBought`. */
export function remainingQuota(alreadyBought = 0): { units: number; costZwg: number } {
  const already = sanitize(alreadyBought);
  const units = Math.max(0, MONTHLY_QUOTA - already);
  const { totalZwg } = costForUnits(units, already);
  return { units, costZwg: totalZwg };
}

export function zwgToUsd(zwg: number): number {
  return zwg / tariffs.zwgPerUsdApprox;
}

export function fmt(n: number, dp = 2): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

export const RATE = tariffs.zwgPerUsdApprox;

export function usdToZwg(usd: number): number {
  return usd * tariffs.zwgPerUsdApprox;
}
