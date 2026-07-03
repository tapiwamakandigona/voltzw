import { describe, it, expect } from "vitest";
import {
  allocateUniqueAmountCents,
  matchDeltaToOrders,
  isOrderExpired,
  parseWalletBalanceCents,
  buildInstructions,
  parseTtlMin,
  toCents,
  fromCents,
  DEFAULT_ORDER_TTL_MIN,
} from "../orders";

describe("allocateUniqueAmountCents", () => {
  it("adds the smallest offset (0.01) when nothing is taken", () => {
    expect(allocateUniqueAmountCents(1000, [])).toBe(1001); // $10 → $10.01
  });

  it("skips taken amounts and picks the next free offset", () => {
    expect(allocateUniqueAmountCents(1000, [1001, 1002])).toBe(1003);
  });

  it("only skips amounts that actually collide with this base", () => {
    // open orders around a different base don't consume this base's offsets
    expect(allocateUniqueAmountCents(2000, [1001, 1002])).toBe(2001);
  });

  it("keeps amounts unique across different bases that collide", () => {
    // $10.00 base with $10.01 open (from an $10 order) and $10.02 open
    // (could be an offset-2 order OR a different base) — both blocked.
    expect(allocateUniqueAmountCents(1000, [1001, 1002, 1003])).toBe(1004);
  });

  it("returns null when all 99 offsets are exhausted", () => {
    const taken = Array.from({ length: 99 }, (_, i) => 1000 + i + 1);
    expect(allocateUniqueAmountCents(1000, taken)).toBeNull();
  });

  it("tolerates float noise in inputs", () => {
    expect(allocateUniqueAmountCents(1000.0000001, [1001.0000002])).toBe(1002);
  });
});

describe("matchDeltaToOrders", () => {
  const o = (id: string, cents: number) => ({ id, amountDueCents: cents });

  it("matches a single order exactly", () => {
    const r = matchDeltaToOrders(1103, [o("a", 1103), o("b", 2201)]);
    expect(r).toEqual({ matched: ["a"], ambiguous: false, candidates: [], truncated: false });
  });

  it("returns no match when delta fits nothing", () => {
    const r = matchDeltaToOrders(999, [o("a", 1103), o("b", 2201)]);
    expect(r).toEqual({ matched: [], ambiguous: false, candidates: [], truncated: false });
  });

  it("returns no match for zero/negative delta", () => {
    expect(matchDeltaToOrders(0, [o("a", 1103)]).matched).toEqual([]);
    expect(matchDeltaToOrders(-500, [o("a", 1103)]).matched).toEqual([]);
  });

  it("matches multiple orders when the sum is unambiguous", () => {
    // two customers paid within one polling window
    const r = matchDeltaToOrders(1103 + 2201, [o("a", 1103), o("b", 2201), o("c", 5001)]);
    expect(r.ambiguous).toBe(false);
    expect([...r.matched].sort()).toEqual(["a", "b"]);
  });

  it("prefers the exact single order over a multi-order subset with the same sum", () => {
    // 3.00 == 1.00 + 2.00, but a single $3.00 payment is the likely event
    const r = matchDeltaToOrders(300, [o("a", 100), o("b", 200), o("c", 300)]);
    expect(r).toEqual({ matched: ["c"], ambiguous: false, candidates: [], truncated: false });
  });

  it("flags ambiguity when several subsets explain the delta", () => {
    // 3.00 == 1.00+2.00 == 0.75+2.25 and no single order equals 3.00
    const r = matchDeltaToOrders(300, [o("a", 100), o("b", 200), o("x", 75), o("y", 225)]);
    expect(r.matched).toEqual([]);
    expect(r.ambiguous).toBe(true);
    expect([...r.candidates].sort()).toEqual(["a", "b", "x", "y"]);
  });

  it("matches an exact single order even when the book exceeds the cap", () => {
    // Payment for the LAST order in a >maxOrders book must still match:
    // the exact-match fast path scans the FULL book before truncation.
    const big = Array.from({ length: 120 }, (_, i) => o(`o${i}`, 10_000 + i * 7));
    const r = matchDeltaToOrders(big[119].amountDueCents, big);
    expect(r).toEqual({ matched: ["o119"], ambiguous: false, candidates: [], truncated: false });
  });

  it("reports truncation when the subset search runs on a capped book", () => {
    const big = Array.from({ length: 120 }, (_, i) => o(`o${i}`, 10_000 + i * 7));
    // No exact single order equals this delta → subset search on capped book.
    const r = matchDeltaToOrders(1, big);
    expect(r.matched).toEqual([]);
    expect(r.truncated).toBe(true);
  });

  it("does not report truncation when the book fits within the cap", () => {
    const small = Array.from({ length: 10 }, (_, i) => o(`o${i}`, 1000 + i));
    expect(matchDeltaToOrders(1, small).truncated).toBe(false);
  });

  it("respects a custom maxOrders cap for the subset search", () => {
    const book = [o("a", 100), o("b", 200), o("c", 300)];
    // cap=2 keeps the two SMALLEST after sorting; 100+200 is still findable.
    const r = matchDeltaToOrders(300, book.filter((x) => x.id !== "c"), 2);
    expect([...r.matched].sort()).toEqual(["a", "b"]);
  });

  it("handles an empty order book", () => {
    expect(matchDeltaToOrders(1103, [])).toEqual({ matched: [], ambiguous: false, candidates: [], truncated: false });
  });
});

describe("isOrderExpired", () => {
  const now = Date.parse("2026-02-25T12:00:00Z");

  it("expires orders past expiresAt", () => {
    expect(isOrderExpired("2026-02-25T11:59:59Z", now)).toBe(true);
  });

  it("keeps orders before expiresAt", () => {
    expect(isOrderExpired("2026-02-25T12:00:01Z", now)).toBe(false);
  });

  it("never auto-expires on malformed timestamps", () => {
    expect(isOrderExpired("", now)).toBe(false);
    expect(isOrderExpired("not-a-date", now)).toBe(false);
  });
});

describe("parseTtlMin", () => {
  it("defaults to 60", () => {
    expect(parseTtlMin(undefined)).toBe(DEFAULT_ORDER_TTL_MIN);
    expect(parseTtlMin("")).toBe(DEFAULT_ORDER_TTL_MIN);
    expect(parseTtlMin("abc")).toBe(DEFAULT_ORDER_TTL_MIN);
    expect(parseTtlMin("0")).toBe(DEFAULT_ORDER_TTL_MIN);
    expect(parseTtlMin("-5")).toBe(DEFAULT_ORDER_TTL_MIN);
  });

  it("parses valid values", () => {
    expect(parseTtlMin("30")).toBe(30);
    expect(parseTtlMin(90)).toBe(90);
  });
});

describe("parseWalletBalanceCents", () => {
  it("reads known keys with numeric values", () => {
    expect(parseWalletBalanceCents({ WalletBalance: 123.45 })).toBe(12345);
    expect(parseWalletBalanceCents({ Balance: 0 })).toBe(0);
  });

  it("reads string values with currency symbols and commas", () => {
    expect(parseWalletBalanceCents({ WalletBalance: "ZWG 1,234.56" })).toBe(123456);
    expect(parseWalletBalanceCents({ balance: "$11.03" })).toBe(1103);
  });

  it("returns null for unusable replies", () => {
    expect(parseWalletBalanceCents(null)).toBeNull();
    expect(parseWalletBalanceCents({})).toBeNull();
    expect(parseWalletBalanceCents({ ReplyCode: 4, ReplyMsg: "error" })).toBeNull();
    expect(parseWalletBalanceCents({ WalletBalance: "n/a" })).toBeNull();
  });

  it("accepts bare numbers and numeric strings", () => {
    expect(parseWalletBalanceCents(55.5)).toBe(5550);
    expect(parseWalletBalanceCents("55.50")).toBe(5550);
  });
});

describe("buildInstructions", () => {
  it("uses the env template and substitutes {amount}", () => {
    const t = JSON.stringify(["Step one", "Pay {amount} now", "Wait"]);
    expect(buildInstructions(t, "$11.03")).toEqual(["Step one", "Pay $11.03 now", "Wait"]);
  });

  it("falls back to defaults on bad JSON", () => {
    const steps = buildInstructions("not json", "$11.03", { code: "12345", name: "Hot" });
    expect(steps.length).toBeGreaterThan(2);
    expect(steps.join(" ")).toContain("$11.03");
    expect(steps.join(" ")).toContain("12345");
  });

  it("never invents a merchant code when none is configured", () => {
    const steps = buildInstructions(undefined, "$5.01");
    expect(steps.join(" ")).not.toMatch(/code \d/);
  });
});

describe("cents helpers", () => {
  it("round-trips dollars/cents", () => {
    expect(toCents(11.03)).toBe(1103);
    expect(fromCents(1103)).toBe(11.03);
    expect(toCents(0.1 + 0.2)).toBe(30);
  });
});
