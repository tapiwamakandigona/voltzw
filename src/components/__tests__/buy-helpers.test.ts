import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_AMOUNT,
  isValidZimMobile,
  sanitizeAmountInput,
  amountError,
  LAST_ORDER_REF_KEY,
  saveLastOrderRef,
  readLastOrderRef,
} from "../buy-helpers";

describe("isValidZimMobile", () => {
  it("accepts local and international Econet/NetOne formats", () => {
    expect(isValidZimMobile("0771234567")).toBe(true);
    expect(isValidZimMobile("+263771234567")).toBe(true);
  });
  it("rejects wrong lengths, landlines and junk", () => {
    expect(isValidZimMobile("")).toBe(false);
    expect(isValidZimMobile("077123456")).toBe(false); // 9 digits
    expect(isValidZimMobile("07712345678")).toBe(false); // 11 digits
    expect(isValidZimMobile("0242123456")).toBe(false); // landline
    expect(isValidZimMobile("263771234567")).toBe(false); // missing +
    expect(isValidZimMobile("+26377123456")).toBe(false);
  });
});

describe("sanitizeAmountInput", () => {
  it("keeps digits and a single decimal point", () => {
    expect(sanitizeAmountInput("12.34")).toBe("12.34");
    expect(sanitizeAmountInput("1.2.3")).toBe("1.23");
    expect(sanitizeAmountInput("...")).toBe(".");
    expect(sanitizeAmountInput("$1,000.50")).toBe("1000.50");
    expect(sanitizeAmountInput("abc")).toBe("");
  });
});

describe("amountError", () => {
  it("is silent for empty input (submit gate handles emptiness)", () => {
    expect(amountError("")).toBeNull();
    expect(amountError("  ")).toBeNull();
  });
  it("rejects zero/negative/non-numeric", () => {
    expect(amountError("0")).toMatch(/greater than 0/);
    expect(amountError(".")).toMatch(/greater than 0/);
  });
  it("mirrors the backend max of 10000", () => {
    expect(amountError(String(MAX_AMOUNT))).toBeNull();
    expect(amountError("10000.01")).toMatch(/maximum/);
    expect(amountError("999999")).toMatch(/maximum/);
  });
  it("accepts normal amounts", () => {
    expect(amountError("5")).toBeNull();
    expect(amountError("11.03")).toBeNull();
  });
});

describe("last order ref persistence (CONTRACT-3)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is a safe no-op without a window (SSR/static export)", () => {
    expect(() => saveLastOrderRef("VZ-123")).not.toThrow();
    expect(readLastOrderRef()).toBeNull();
  });

  it("round-trips through localStorage under the pinned key", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        setItem: (k: string, v: string) => store.set(k, v),
        getItem: (k: string) => store.get(k) ?? null,
      },
    });
    saveLastOrderRef("VZ-42");
    expect(store.get(LAST_ORDER_REF_KEY)).toBe("VZ-42");
    expect(readLastOrderRef()).toBe("VZ-42");
  });

  it("swallows storage failures (private mode)", () => {
    vi.stubGlobal("window", {
      localStorage: {
        setItem: () => { throw new Error("quota"); },
        getItem: () => { throw new Error("blocked"); },
      },
    });
    expect(() => saveLastOrderRef("VZ-1")).not.toThrow();
    expect(readLastOrderRef()).toBeNull();
  });
});
