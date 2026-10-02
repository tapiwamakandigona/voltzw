import { describe, expect, it } from "vitest";
import { TARIFFS, TARIFF_DAY_LABEL } from "../tariff";

describe("TARIFF_DAY_LABEL", () => {
  it("is a human-readable form of the effective date, not the ISO string", () => {
    expect(TARIFF_DAY_LABEL).not.toBe(TARIFFS.effectiveDate);
    // e.g. "2 Oct 2026" (en-GB may render September as "Sept")
    expect(TARIFF_DAY_LABEL).toMatch(/^\d{1,2} [A-Z][a-z]{2,3} \d{4}$/);
    const [, , year] = TARIFF_DAY_LABEL.split(" ");
    expect(year).toBe(TARIFFS.effectiveDate.slice(0, 4));
    const day = Number(TARIFF_DAY_LABEL.split(" ")[0]);
    expect(day).toBe(Number(TARIFFS.effectiveDate.slice(8, 10)));
  });
});
