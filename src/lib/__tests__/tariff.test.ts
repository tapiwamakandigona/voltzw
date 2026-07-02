import { describe, it, expect } from "vitest";
import { costForUnits, unitsForAmount, remainingQuota, BANDS, MONTHLY_QUOTA } from "../tariff";

const r1 = BANDS[0].inclLevyZwg; // first band rate incl levy
const r2 = BANDS[1].inclLevyZwg;
const rTop = BANDS[BANDS.length - 1].inclLevyZwg;

describe("costForUnits", () => {
  it("prices a purchase entirely inside the first band", () => {
    const { totalZwg, slices } = costForUnits(30);
    expect(totalZwg).toBeCloseTo(30 * r1, 6);
    expect(slices).toHaveLength(1);
  });

  it("splits across band boundaries exactly", () => {
    const { totalZwg, slices } = costForUnits(80);
    expect(slices).toHaveLength(2);
    expect(slices[0].units).toBe(50);
    expect(slices[1].units).toBe(30);
    expect(totalZwg).toBeCloseTo(50 * r1 + 30 * r2, 6);
  });

  it("respects units already bought this month", () => {
    // already at 50 units -> everything priced from band 2
    const { totalZwg } = costForUnits(10, 50);
    expect(totalZwg).toBeCloseTo(10 * r2, 6);
  });

  it("prices everything above the quota at the top rate", () => {
    const { totalZwg, slices } = costForUnits(10, MONTHLY_QUOTA + 100);
    expect(slices).toHaveLength(1);
    expect(totalZwg).toBeCloseTo(10 * rTop, 6);
  });

  it("returns zero for zero units", () => {
    expect(costForUnits(0).totalZwg).toBe(0);
  });
});

describe("unitsForAmount", () => {
  it("is the inverse of costForUnits within a band", () => {
    const cost = costForUnits(40).totalZwg;
    expect(unitsForAmount(cost).totalUnits).toBeCloseTo(40, 6);
  });

  it("is the inverse across bands and with alreadyBought", () => {
    const cost = costForUnits(120, 75).totalZwg;
    expect(unitsForAmount(cost, 75).totalUnits).toBeCloseTo(120, 6);
  });

  it("buys fewer units for the same money once bands are consumed", () => {
    const fresh = unitsForAmount(500, 0).totalUnits;
    const later = unitsForAmount(500, 300).totalUnits;
    expect(later).toBeLessThan(fresh);
  });

  it("handles zero and negative budgets", () => {
    expect(unitsForAmount(0).totalUnits).toBe(0);
    expect(unitsForAmount(-5).totalUnits).toBe(0);
  });
});

describe("remainingQuota", () => {
  it("counts down from the monthly quota", () => {
    expect(remainingQuota(0).units).toBe(MONTHLY_QUOTA);
    expect(remainingQuota(150).units).toBe(MONTHLY_QUOTA - 150);
    expect(remainingQuota(MONTHLY_QUOTA + 50).units).toBe(0);
  });
});
