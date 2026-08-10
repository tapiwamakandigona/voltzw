import raw from "@/data/tariff-history.json";
import { BANDS, costForUnits, type Band } from "@/lib/tariff";

/** One published tariff schedule, keyed by the date it took effect.
 *  `base`/`incl` are the six band prices in ZWG per kWh (index 0 = first 50
 *  units), `fx` the ZWG-per-USD approximation published with them. */
export type Snapshot = {
  d: string;
  base: number[];
  incl: number[];
  fx: number;
};

/** Oldest → newest. Appended by `scripts/build-history.mjs` on every tariff
 *  sync, so it is the only public record of how ZESA rates have moved. */
export const HISTORY = raw as Snapshot[];

export const FIRST_DATE = HISTORY[0]?.d ?? "";
export const LATEST = HISTORY[HISTORY.length - 1];

/** Entry-band (first 50 units) price incl. levy, the series people recognise. */
export function entryBandSeries(): { d: string; v: number }[] {
  return HISTORY.map((s) => ({ d: s.d, v: s.incl[0] }));
}

/** Percentage change of the entry band across the whole record. */
export function totalDriftPct(): number {
  if (HISTORY.length < 2) return 0;
  const a = HISTORY[0].incl[0];
  const b = LATEST.incl[0];
  return ((b - a) / a) * 100;
}

/** How many recorded schedules differed from the one before them. */
export function changeCount(): number {
  let n = 0;
  for (let i = 1; i < HISTORY.length; i++) {
    if (HISTORY[i].base.some((v, j) => v !== HISTORY[i - 1].base[j])) n++;
  }
  return n;
}

/** Every month from the first record to the latest one, newest first, with no
 *  holes — a month in which ZESA published nothing is still a month people
 *  search for ("zesa tariffs june 2026"), and skipping it turned
 *  /zesa-tariffs/2026-06/ into a 404. Use `rateInForce` for those months. */
export function monthKeys(): string[] {
  if (!HISTORY.length) return [];
  const [first, last] = [FIRST_DATE.slice(0, 7), LATEST.d.slice(0, 7)];
  const keys: string[] = [];
  let [y, m] = first.split("-").map(Number);
  for (let guard = 0; guard < 1200; guard++) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    keys.push(key);
    if (key === last) break;
    if (++m > 12) {
      m = 1;
      y++;
    }
  }
  return keys.reverse();
}

/** Months with at least one published schedule, newest first. */
export function monthsWithSchedules(): string[] {
  return [...new Set(HISTORY.map((s) => s.d.slice(0, 7)))].sort().reverse();
}

export function monthLabel(key: string): string {
  return new Date(key + "-01T00:00:00Z").toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function snapshotsForMonth(key: string): Snapshot[] {
  return HISTORY.filter((s) => s.d.startsWith(key));
}

/** The schedule that was already in force when `key` began, i.e. the newest
 *  snapshot dated before the 1st of that month. Null before the record starts.
 *  This is what a month with no publication of its own actually charged — no
 *  data is invented, the earlier schedule is simply still valid. */
export function rateInForce(key: string): Snapshot | null {
  const start = `${key}-01`;
  let found: Snapshot | null = null;
  for (const s of HISTORY) {
    if (s.d < start) found = s;
    else break;
  }
  return found;
}

/** Min/max entry-band price inside a month — the honest way to say
 *  "tariffs in July 2026" when they moved almost daily. Months where nothing
 *  new was published report the carried-over rate as a flat range. */
export function monthRange(key: string): { min: number; max: number } | null {
  const rows = snapshotsForMonth(key);
  if (!rows.length) {
    const held = rateInForce(key);
    return held ? { min: held.incl[0], max: held.incl[0] } : null;
  }
  const vals = rows.map((r) => r.incl[0]);
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

const CSV_HEADER =
  "effective_date,band1_base_zwg,band2_base_zwg,band3_base_zwg,band4_base_zwg,band5_base_zwg,band6_base_zwg," +
  "band1_incl_levy_zwg,band2_incl_levy_zwg,band3_incl_levy_zwg,band4_incl_levy_zwg,band5_incl_levy_zwg,band6_incl_levy_zwg," +
  "zwg_per_usd";

export function toCsv(): string {
  const lines = HISTORY.map((s) => [s.d, ...s.base, ...s.incl, s.fx].join(","));
  return [CSV_HEADER, ...lines].join("\n") + "\n";
}

/** SVG polyline points for a sparkline of `values` in a `w`×`h` box.
 *  Rendered server-side into static HTML — no client-side chart library. */
export function sparklinePoints(values: number[], w: number, h: number, pad = 4): string {
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = pad + i * stepX;
      const y = h - pad - ((v - min) / span) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/** Rebuild a full `Band[]` for a historical snapshot: band boundaries and
 *  labels have never changed, only the per-kWh prices, so the current bands
 *  are reused with that day's prices substituted. Lets any page price the
 *  same purchase under an older schedule. */
export function bandsAt(s: Snapshot): Band[] {
  return BANDS.map((b, i) => ({
    ...b,
    baseZwg: s.base[i] ?? b.baseZwg,
    inclLevyZwg: s.incl[i] ?? b.inclLevyZwg,
    usdApprox: s.fx > 0 ? (s.incl[i] ?? b.inclLevyZwg) / s.fx : b.usdApprox,
  }));
}

/** The most recent snapshot whose prices differ from today's — i.e. the
 *  schedule that was in force before the current one. Null when the record
 *  only ever contains one set of prices. */
export function previousDifferentSnapshot(): Snapshot | null {
  if (!LATEST) return null;
  for (let i = HISTORY.length - 2; i >= 0; i--) {
    if (HISTORY[i].incl.some((v, j) => v !== LATEST.incl[j])) return HISTORY[i];
  }
  return null;
}

/** What `units` kWh cost under the previous schedule, and the % change since,
 *  for pages that want to show movement instead of a bare number. */
export function priceChangeForUnits(units: number): { then: number; thenDate: string; pct: number } | null {
  const prev = previousDifferentSnapshot();
  if (!prev) return null;
  const then = costForUnits(units, 0, bandsAt(prev)).totalZwg;
  const now = costForUnits(units).totalZwg;
  if (then <= 0) return null;
  return { then, thenDate: prev.d, pct: ((now - then) / then) * 100 };
}
