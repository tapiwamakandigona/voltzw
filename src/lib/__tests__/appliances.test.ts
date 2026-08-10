import { describe, expect, it } from "vitest";
import { APPLIANCES, QUOTA_DAILY_KWH, daysOfQuotaUse, formatDuration, runtimeFor } from "@/lib/appliances";
import { MONTHLY_QUOTA } from "@/lib/tariff";

describe("appliance runtime maths", () => {
  it("divides units by the continuous draw", () => {
    // 100 kWh into a 2 kW plate is 50 hours.
    expect(runtimeFor(100, { name: "plate", watts: 2000 }).hours).toBeCloseTo(50, 6);
  });

  it("treats duty-cycled appliances as a daily figure", () => {
    // A fridge using 1.2 kWh/day burns 0.05 kWh/h, so 1.2 kWh is exactly a day.
    expect(runtimeFor(1.2, { name: "fridge", kwhPerDay: 1.2 }).hours).toBeCloseTo(24, 6);
  });

  it("returns a dash rather than Infinity for nonsense input", () => {
    expect(runtimeFor(0, APPLIANCES[0]).label).toBe("—");
    expect(runtimeFor(100, { name: "nothing" }).label).toBe("—");
  });

  it("every listed appliance has exactly one energy figure", () => {
    for (const a of APPLIANCES) {
      const hasWatts = a.watts !== undefined;
      const hasDaily = a.kwhPerDay !== undefined;
      expect(hasWatts !== hasDaily).toBe(true);
      expect((a.watts ?? a.kwhPerDay ?? 0) > 0).toBe(true);
    }
  });
});

describe("formatDuration", () => {
  it("uses minutes under an hour", () => {
    expect(formatDuration(0.5)).toBe("30 min");
  });
  it("uses hours and minutes under two days", () => {
    expect(formatDuration(2.5)).toBe("2 h 30 min");
    expect(formatDuration(3)).toBe("3 h");
  });
  it("switches to days past 48 hours", () => {
    expect(formatDuration(72)).toBe("3 days");
    expect(formatDuration(24 * 30)).toBe("30 days");
  });
  it("never renders Infinity or NaN", () => {
    expect(formatDuration(Infinity)).toBe("—");
    expect(formatDuration(NaN)).toBe("—");
    expect(formatDuration(-5)).toBe("—");
  });
});

describe("quota baseline", () => {
  it("derives the daily figure from the published monthly quota", () => {
    expect(QUOTA_DAILY_KWH).toBeCloseTo(MONTHLY_QUOTA / 30, 10);
  });
  it("scales linearly and floors at zero", () => {
    expect(daysOfQuotaUse(MONTHLY_QUOTA)).toBeCloseTo(30, 6);
    expect(daysOfQuotaUse(0)).toBe(0);
    expect(daysOfQuotaUse(-1)).toBe(0);
  });
});

describe("page-specific copy", () => {
  it("covers every generated /units page and stays unique", async () => {
    const { UNIT_COPY, AMOUNT_COPY } = await import("@/lib/copy");
    const { AMOUNT_PAGES, UNIT_PAGES } = await import("@/lib/amounts");
    for (const u of UNIT_PAGES) expect(UNIT_COPY[u.units], `missing copy for ${u.slug}`).toBeTruthy();
    for (const a of AMOUNT_PAGES) expect(AMOUNT_COPY[a.slug], `missing copy for ${a.slug}`).toBeTruthy();
    const all = [...Object.values(UNIT_COPY), ...Object.values(AMOUNT_COPY)];
    expect(new Set(all).size).toBe(all.length);
    for (const text of all) expect(text.split(/\s+/).length).toBeGreaterThan(25);
  });
});
