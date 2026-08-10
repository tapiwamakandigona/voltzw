import { describe, expect, it } from "vitest";
import { HISTORY, LATEST, bandsAt, previousDifferentSnapshot, priceChangeForUnits } from "@/lib/history";
import { BANDS, costForUnits } from "@/lib/tariff";

describe("bandsAt", () => {
  it("keeps the band boundaries and swaps in that day's prices", () => {
    const bands = bandsAt(HISTORY[0]);
    expect(bands).toHaveLength(BANDS.length);
    bands.forEach((b, i) => {
      expect(b.from).toBe(BANDS[i].from);
      expect(b.to).toBe(BANDS[i].to);
      expect(b.label).toBe(BANDS[i].label);
      expect(b.inclLevyZwg).toBe(HISTORY[0].incl[i]);
    });
  });

  it("prices a purchase under the oldest schedule with the oldest rates", () => {
    const then = costForUnits(100, 0, bandsAt(HISTORY[0])).totalZwg;
    const expected = HISTORY[0].incl[0] * 50 + HISTORY[0].incl[1] * 50;
    expect(then).toBeCloseTo(expected, 6);
  });
});

describe("previousDifferentSnapshot", () => {
  it("never returns a snapshot with today's prices", () => {
    const prev = previousDifferentSnapshot();
    if (prev) {
      expect(prev.incl.some((v, i) => v !== LATEST.incl[i])).toBe(true);
      expect(prev.d <= LATEST.d).toBe(true);
    }
  });
});

describe("priceChangeForUnits", () => {
  it("agrees with the two costings it compares", () => {
    const move = priceChangeForUnits(200);
    if (move) {
      const now = costForUnits(200).totalZwg;
      expect(move.pct).toBeCloseTo(((now - move.then) / move.then) * 100, 6);
      expect(move.then).toBeGreaterThan(0);
    }
  });
});
