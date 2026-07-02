import { describe, it, expect } from "vitest";
import { parseFeePct, tokenValueForGross, DEFAULT_FEE_PCT } from "../fee";

describe("parseFeePct", () => {
  it("defaults to 10 when unset", () => {
    expect(parseFeePct(undefined)).toBe(DEFAULT_FEE_PCT);
    expect(parseFeePct(null)).toBe(DEFAULT_FEE_PCT);
    expect(parseFeePct("")).toBe(DEFAULT_FEE_PCT);
  });

  it("defaults to 10 when invalid", () => {
    expect(parseFeePct("abc")).toBe(DEFAULT_FEE_PCT);
    expect(parseFeePct("-5")).toBe(DEFAULT_FEE_PCT);
    expect(parseFeePct(NaN)).toBe(DEFAULT_FEE_PCT);
    expect(parseFeePct(Infinity)).toBe(DEFAULT_FEE_PCT);
  });

  it("accepts 0 (fee disabled)", () => {
    expect(parseFeePct("0")).toBe(0);
    expect(parseFeePct(0)).toBe(0);
  });

  it("parses valid values", () => {
    expect(parseFeePct("10")).toBe(10);
    expect(parseFeePct("7.5")).toBe(7.5);
    expect(parseFeePct(15)).toBe(15);
  });
});

describe("tokenValueForGross", () => {
  it("takes the fee out of the gross amount", () => {
    expect(tokenValueForGross(10, 10)).toBeCloseTo(9.09, 10);
    expect(tokenValueForGross(11, 10)).toBeCloseTo(10, 10);
    expect(tokenValueForGross(20, 10)).toBeCloseTo(18.18, 10);
  });

  it("returns the gross unchanged when fee is 0", () => {
    expect(tokenValueForGross(10, 0)).toBe(10);
    expect(tokenValueForGross(12.34, 0)).toBe(12.34);
  });

  it("rounds to cents", () => {
    expect(tokenValueForGross(5, 10)).toBeCloseTo(4.55, 10); // 4.5454… -> 4.55
    expect(tokenValueForGross(50, 10)).toBeCloseTo(45.45, 10);
  });

  it("keeps profit = gross - tokenValue non-negative", () => {
    for (const gross of [1, 5, 9.99, 10, 100, 250]) {
      expect(gross - tokenValueForGross(gross, 10)).toBeGreaterThanOrEqual(0);
    }
  });
});
