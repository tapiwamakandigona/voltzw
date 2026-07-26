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
  it("lists months newest first and only months present in the data", () => {
    const keys = monthKeys();
    expect(keys.length).toBeGreaterThan(0);
    expect([...keys].sort().reverse()).toEqual(keys);
    for (const k of keys) expect(snapshotsForMonth(k).length).toBeGreaterThan(0);
    expect(keys).toContain(LATEST.d.slice(0, 7));
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
