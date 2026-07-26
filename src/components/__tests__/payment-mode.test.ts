import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BUILD_MODE, canBuy, fetchHealth, normalizeMode, resetHealthCache } from "../payment-mode";

describe("normalizeMode", () => {
  it("accepts only the three real modes", () => {
    expect(normalizeMode("coming_soon")).toBe("coming_soon");
    expect(normalizeMode("semi_auto")).toBe("semi_auto");
    expect(normalizeMode("paynow")).toBe("paynow");
  });

  it("rejects anything else instead of guessing", () => {
    for (const bad of ["", "live", "PAYNOW", null, undefined, 1, {}]) {
      expect(normalizeMode(bad)).toBeNull();
    }
  });
});

describe("canBuy", () => {
  it("is false in coming_soon regardless of configuration", () => {
    expect(canBuy({ mode: "coming_soon", configured: true })).toBe(false);
    expect(canBuy({ mode: "coming_soon", configured: false })).toBe(false);
  });

  it("is true in semi_auto, which does not need the Paynow keys", () => {
    expect(canBuy({ mode: "semi_auto", configured: false })).toBe(true);
  });

  it("requires configuration in paynow, where checkout is hosted", () => {
    expect(canBuy({ mode: "paynow", configured: false })).toBe(false);
    expect(canBuy({ mode: "paynow", configured: true })).toBe(true);
  });
});

describe("build-time fallback", () => {
  it("defaults to the safest mode when the env var is unset or bogus", () => {
    // vitest runs without NEXT_PUBLIC_PAYMENT_MODE set
    expect(BUILD_MODE).toBe("coming_soon");
  });
});

describe("fetchHealth", () => {
  beforeEach(() => resetHealthCache());
  afterEach(() => {
    vi.unstubAllGlobals();
    resetHealthCache();
  });

  it("requests /health once and shares the result", async () => {
    const json = { configured: true, paymentMode: "semi_auto", feePct: 5 };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => json });
    vi.stubGlobal("fetch", fetchMock);
    const [a, b] = await Promise.all([fetchHealth(), fetchHealth()]);
    expect(a).toEqual(json);
    expect(b).toEqual(json);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/health");
  });

  it("resolves to null on a network error instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(fetchHealth()).resolves.toBeNull();
  });

  it("resolves to null on a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    await expect(fetchHealth()).resolves.toBeNull();
  });
});
