import { describe, expect, it } from "vitest";
import { parseBands, parseSourceDate, validateBands } from "../../../scripts/update-tariffs.mjs";
import tariffs from "../../data/tariffs.json";

// Verbatim shape of the source table as re-cut on 2026-08-25: USD base,
// USD incl. 6% REA, ZiG incl. 6% REA. Whitespace-collapsed, tags stripped,
// exactly as the scraper sees it.
const CURRENT = `ZESA Tariffs ZESA electricity tariffs as of 31 August 2026 Prices last confirmed 10 minutes ago.
 Domestic stepped tariff, per kWh (unit) Consumption band Price (USD) Price incl. 6% REA (USD) Price incl. 6% REA (ZiG)
 1–50 units US$0.0800 US$0.0848 ZiG 2.2581
 51–100 units US$0.0900 US$0.0954 ZiG 2.5404
 101–200 units US$0.1600 US$0.1696 ZiG 4.5163
 201–300 units US$0.2300 US$0.2438 ZiG 6.4922
 301–400 units US$0.2500 US$0.2650 ZiG 7.0567
 401 units and above US$0.2600 US$0.2756 ZiG 7.3390`.replace(/\s+/g, " ");

// The layout the scraper was originally written against.
const LEGACY = `Latest ZESA Tariffs Monday, 24 August 2026
 First 50 Units 2.1303 ZiG 2.2581 ZiG US$0.08
 51 – 100 2.3966 ZiG 2.5404 ZiG US$0.09
 101 – 200 4.2607 ZiG 4.5163 ZiG US$0.16
 201 – 300 6.1247 ZiG 6.4922 ZiG US$0.23
 301 – 400 6.6573 ZiG 7.0567 ZiG US$0.25
 401 and above 6.9236 ZiG 7.3390 ZiG US$0.26`.replace(/\s+/g, " ");

describe("tariff scrape", () => {
  it("reads the current source layout", () => {
    const parsed = parseBands(CURRENT)!;
    expect(parsed.format).toBe("current");
    expect(parsed.bands).toHaveLength(6);
    expect(parsed.bands[0]).toEqual({ baseZwg: 2.1303, inclLevyZwg: 2.2581, usdApprox: 0.08 });
    expect(parsed.bands[5]).toEqual({ baseZwg: 6.9236, inclLevyZwg: 7.339, usdApprox: 0.26 });
  });

  it("still reads the legacy source layout", () => {
    const parsed = parseBands(LEGACY)!;
    expect(parsed.format).toBe("legacy");
    expect(parsed.bands[0]).toEqual({ baseZwg: 2.1303, inclLevyZwg: 2.2581, usdApprox: 0.08 });
  });

  it("derives the same base rates from both layouts", () => {
    expect(parseBands(CURRENT)!.bands).toEqual(parseBands(LEGACY)!.bands);
  });

  it("returns null instead of guessing when the layout is unknown", () => {
    expect(parseBands("Consumption band Price 1-50 units 2.2581")).toBeNull();
    expect(parseBands("")).toBeNull();
  });

  it("reads the source date from either wording", () => {
    expect(parseSourceDate(CURRENT)).toBe("2026-08-31");
    expect(parseSourceDate(LEGACY)).toBe("2026-08-24");
    expect(parseSourceDate("no date here")).toBeNull();
  });

  it("rejects implausible scrapes", () => {
    const good = parseBands(CURRENT)!.bands;
    expect(validateBands(good, tariffs.bands)).toBeNull();

    const descending = good.map((b, i) => (i === 3 ? { ...b, baseZwg: 0.5 } : b));
    expect(validateBands(descending, tariffs.bands)).toMatch(/lower than band/);

    // Scale the whole band, not just the base, so this exercises the >5x guard
    // rather than tripping the incl-levy-below-base check first.
    const jumped = good.map((b, i) =>
      i === 0 ? { ...b, baseZwg: b.baseZwg * 6, inclLevyZwg: b.inclLevyZwg * 6 } : b,
    );
    expect(validateBands(jumped, tariffs.bands)).toMatch(/jumped/);

    const levyBelowBase = good.map((b, i) => (i === 0 ? { ...b, inclLevyZwg: b.baseZwg - 0.1 } : b));
    expect(validateBands(levyBelowBase, tariffs.bands)).toMatch(/incl-levy below base/);
  });
});
