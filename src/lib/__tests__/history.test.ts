import { describe, it, expect } from "vitest";
import {
  HISTORY,
  FIRST_DATE,
  LATEST,
  changeCount,
  entryBandSeries,
  monthKeys,
  monthLabel,
  monthRange,
  monthsWithSchedules,
  rateInForce,
  snapshotsForMonth,
  sparklinePoints,
  toCsv,
  totalDriftPct,
} from "../history";

describe("tariff history data", () => {
  it("is non-empty, ordered oldest → newest, and has unique dates", () => {
    expect(HISTORY.length).toBeGreaterThan(1);
    const dates = HISTORY.map((s) => s.d);
    expect([...dates].sort()).toEqual(dates);
    expect(new Set(dates).size).toBe(dates.length);
    expect(FIRST_DATE).toBe(dates[0]);
    expect(LATEST.d).toBe(dates[dates.length - 1]);
  });

  it("holds six plausible, non-decreasing bands per snapshot", () => {
    for (const s of HISTORY) {
      expect(s.base).toHaveLength(6);
      expect(s.incl).toHaveLength(6);
      expect(s.fx).toBeGreaterThan(5);
      for (let i = 0; i < 6; i++) {
        expect(s.base[i]).toBeGreaterThan(0.1);
        expect(s.base[i]).toBeLessThan(100);
        // the levy can never make a band cheaper than its base price
        expect(s.incl[i]).toBeGreaterThanOrEqual(s.base[i]);
        if (i > 0) expect(s.base[i]).toBeGreaterThanOrEqual(s.base[i - 1]);
      }
    }
  });
});

describe("derived series", () => {
  it("entryBandSeries tracks the first band incl. levy", () => {
    const series = entryBandSeries();
    expect(series).toHaveLength(HISTORY.length);
    expect(series[0]).toEqual({ d: HISTORY[0].d, v: HISTORY[0].incl[0] });
  });

  it("totalDriftPct compares the ends of the record", () => {
    const expected = ((LATEST.incl[0] - HISTORY[0].incl[0]) / HISTORY[0].incl[0]) * 100;
    expect(totalDriftPct()).toBeCloseTo(expected, 9);
  });

  it("changeCount never exceeds the number of transitions", () => {
    const n = changeCount();
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThanOrEqual(HISTORY.length - 1);
  });
});

describe("month grouping", () => {
  // SPEC CHANGE (2026-08-10): monthKeys used to list only months that had a
  // published schedule, which left holes (nothing was published between
  // 2026-05-27 and 2026-06-30) and made /zesa-tariffs/2026-06/ a 404 while its
  // neighbours were 200. It now spans first→latest with no gaps; the
  // "only months with data" guarantee moved to monthsWithSchedules().
  it("spans every month from the first record to the latest, newest first, no holes", () => {
    const keys = monthKeys();
    expect(keys.length).toBeGreaterThan(0);
    expect([...keys].sort().reverse()).toEqual(keys);
    expect(keys[0]).toBe(LATEST.d.slice(0, 7));
    expect(keys[keys.length - 1]).toBe(FIRST_DATE.slice(0, 7));
    expect(new Set(keys).size).toBe(keys.length);
    // consecutive: stepping back one month from each key yields the next one
    for (let i = 0; i < keys.length - 1; i++) {
      const [y, m] = keys[i].split("-").map(Number);
      const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
      expect(keys[i + 1]).toBe(prev);
    }
    // every listed month resolves to a price: its own schedules, or the one
    // still in force from an earlier month
    for (const k of keys) {
      expect(snapshotsForMonth(k).length > 0 || rateInForce(k) !== null).toBe(true);
    }
  });

  it("monthsWithSchedules lists only months that published, newest first", () => {
    const keys = monthsWithSchedules();
    expect(keys.length).toBeGreaterThan(0);
    expect([...keys].sort().reverse()).toEqual(keys);
    for (const k of keys) expect(snapshotsForMonth(k).length).toBeGreaterThan(0);
    expect(keys).toContain(LATEST.d.slice(0, 7));
    expect(monthKeys()).toEqual(expect.arrayContaining(keys));
  });

  it("rateInForce returns the newest schedule predating the month, or null", () => {
    expect(rateInForce(FIRST_DATE.slice(0, 7))).toBeNull();
    expect(rateInForce("1999-01")).toBeNull();
    const later = monthKeys()[0];
    const held = rateInForce(later);
    expect(held).not.toBeNull();
    expect(held!.d < `${later}-01`).toBe(true);
    // nothing between it and the month start
    expect(HISTORY.filter((s) => s.d > held!.d && s.d < `${later}-01`)).toHaveLength(0);
  });

  it("gap months still render: every key has a range, and 2026-06 is one of them", () => {
    for (const k of monthKeys()) expect(monthRange(k)).not.toBeNull();
    const gaps = monthKeys().filter((k) => snapshotsForMonth(k).length === 0);
    for (const k of gaps) {
      const r = monthRange(k)!;
      // a carried-over month is a flat rate, equal to the schedule in force
      expect(r.min).toBe(r.max);
      expect(r.min).toBe(rateInForce(k)!.incl[0]);
    }
  });

  it("labels months in UTC so the build machine's timezone can't shift them", () => {
    expect(monthLabel("2026-07")).toBe("July 2026");
    expect(monthLabel("2026-01")).toBe("January 2026");
  });

  it("monthRange brackets the entry band, and is null for unknown months", () => {
    const key = monthKeys()[0];
    const range = monthRange(key)!;
    const vals = snapshotsForMonth(key).map((s) => s.incl[0]);
    expect(range.min).toBe(Math.min(...vals));
    expect(range.max).toBe(Math.max(...vals));
    expect(monthRange("1999-01")).toBeNull();
  });
});

describe("exports", () => {
  it("csv has a header plus one row per snapshot, all 14 columns wide", () => {
    const lines = toCsv().trim().split("\n");
    expect(lines).toHaveLength(HISTORY.length + 1);
    expect(lines[0].startsWith("effective_date,")).toBe(true);
    for (const l of lines) expect(l.split(",")).toHaveLength(14);
  });

  it("sparkline points stay inside the box and are flat for a constant series", () => {
    const pts = sparklinePoints([1, 5, 3], 100, 50).split(" ").map((p) => p.split(",").map(Number));
    expect(pts).toHaveLength(3);
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(50);
    }
    // a zero-variance series must not divide by zero
    expect(sparklinePoints([2, 2, 2], 100, 50)).not.toContain("NaN");
    expect(sparklinePoints([], 100, 50)).toBe("");
  });
});
