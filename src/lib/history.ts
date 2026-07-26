import raw from "@/data/tariff-history.json";

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

/** Month keys present in the record, newest first, e.g. ["2026-07", "2026-05"]. */
export function monthKeys(): string[] {
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

/** Min/max entry-band price inside a month — the honest way to say
 *  "tariffs in July 2026" when they moved almost daily. */
export function monthRange(key: string): { min: number; max: number } | null {
  const rows = snapshotsForMonth(key);
  if (!rows.length) return null;
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
