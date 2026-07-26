import { describe, it, expect } from "vitest";
import { AMOUNT_PAGES, AMOUNT_SLUGS, findAmountPage, siblings } from "../amounts";
import { RATE, unitsForAmount } from "../tariff";

describe("amount pages", () => {
  it("has unique, URL-safe slugs", () => {
    expect(new Set(AMOUNT_SLUGS).size).toBe(AMOUNT_SLUGS.length);
    for (const slug of AMOUNT_SLUGS) expect(slug).toMatch(/^(zwg|usd)-\d+$/);
  });

  it("converts USD amounts at the published rate", () => {
    const p = findAmountPage("usd-10")!;
    expect(p.currency).toBe("USD");
    expect(p.amountZwg).toBeCloseTo(10 * RATE, 6);
  });

  it("uses the same band maths as the calculator", () => {
    for (const p of AMOUNT_PAGES) {
      expect(p.units).toBeCloseTo(unitsForAmount(p.amountZwg).totalUnits, 6);
      expect(p.units).toBeGreaterThan(0);
    }
  });

  it("gives more units for more money, within a currency", () => {
    for (const cur of ["ZWG", "USD"] as const) {
      const rows = AMOUNT_PAGES.filter((p) => p.currency === cur);
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i].amount).toBeGreaterThan(rows[i - 1].amount);
        expect(rows[i].units).toBeGreaterThan(rows[i - 1].units);
      }
    }
  });

  it("returns undefined for unknown slugs rather than guessing", () => {
    expect(findAmountPage("zwg-999999")).toBeUndefined();
    expect(findAmountPage("../secrets")).toBeUndefined();
  });

  it("siblings stay in the same currency and exclude the page itself", () => {
    const p = findAmountPage("zwg-500")!;
    const sib = siblings(p);
    expect(sib.length).toBeGreaterThan(0);
    for (const s of sib) {
      expect(s.currency).toBe("ZWG");
      expect(s.slug).not.toBe(p.slug);
    }
  });
});
