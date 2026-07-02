import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import * as feeTs from "../fee";
import * as ordersTs from "../orders";
import { costForUnits, BANDS, MONTHLY_QUOTA } from "../tariff";

/** Parity suite: functions/vend/src/main.js hand-duplicates the money math
 *  in src/lib/fee.ts and src/lib/orders.ts (the function bundle can't import
 *  TS). This suite extracts those copies from the real function source and
 *  runs BOTH implementations across band boundaries and edge cases, so any
 *  drift between the two fails CI instead of silently mis-pricing vends. */

const MAIN_JS = readFileSync(
  path.resolve(__dirname, "../../../functions/vend/src/main.js"),
  "utf8"
);

/** Extract `function name(...) { ... }` with balanced braces from main.js. */
function extractFunction(name: string): string {
  const start = MAIN_JS.indexOf(`function ${name}(`);
  if (start === -1) throw new Error(`function ${name} not found in vend main.js`);
  let i = MAIN_JS.indexOf("{", start);
  let depth = 0;
  for (; i < MAIN_JS.length; i++) {
    if (MAIN_JS[i] === "{") depth++;
    else if (MAIN_JS[i] === "}") {
      depth--;
      if (depth === 0) return MAIN_JS.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced braces extracting ${name}`);
}

function extractConst(name: string): string {
  const m = MAIN_JS.match(new RegExp(`const ${name} = [^;]+;`));
  if (!m) throw new Error(`const ${name} not found in vend main.js`);
  return m[0];
}

const NAMES = [
  "parseFeePct",
  "tokenValueForGross",
  "toCents",
  "fromCents",
  "parseTtlMin",
  "allocateUniqueAmountCents",
  "matchDeltaToOrders",
] as const;

const source = [
  extractConst("DEFAULT_FEE_PCT"),
  extractConst("DEFAULT_ORDER_TTL_MIN"),
  ...NAMES.map(extractFunction),
  `return { ${NAMES.join(", ")}, DEFAULT_FEE_PCT, DEFAULT_ORDER_TTL_MIN };`,
].join("\n");

/* eslint-disable @typescript-eslint/no-explicit-any */
const vend: any = new Function(source)();

/* Gross amounts customers actually pay: exact costs at every tariff band
 * boundary (both sides), plus generic edge values. */
const bandBoundaryGrosses = BANDS.flatMap((b) => {
  const edges = [b.from - 1, b.from, b.to ?? MONTHLY_QUOTA + 100];
  return edges.map((u) => Math.round(costForUnits(u, 0).totalZwg * 100) / 100);
});
const grossCases = [
  ...bandBoundaryGrosses,
  0, 0.01, 0.99, 1, 5, 9.99, 10.01, 11.03, 100.005, 249.995, 1_000_000,
];
const feePcts = [0, 1, 7.5, 10, 12.34, 100];

describe("vend function parity — fee math", () => {
  it("defaults match", () => {
    expect(vend.DEFAULT_FEE_PCT).toBe(feeTs.DEFAULT_FEE_PCT);
  });

  it("parseFeePct agrees on all edge inputs", () => {
    const inputs = [undefined, null, "", "0", 0, "10", 7.5, -1, "-3", "abc", NaN, Infinity, "1e3"];
    for (const raw of inputs) {
      expect(vend.parseFeePct(raw), `parseFeePct(${String(raw)})`).toBe(feeTs.parseFeePct(raw));
    }
  });

  it("tokenValueForGross agrees across band boundaries and edge amounts", () => {
    for (const gross of grossCases) {
      for (const pct of feePcts) {
        expect(vend.tokenValueForGross(gross, pct), `gross=${gross} pct=${pct}`).toBe(
          feeTs.tokenValueForGross(gross, pct)
        );
      }
    }
  });
});

describe("vend function parity — order math", () => {
  it("defaults match", () => {
    expect(vend.DEFAULT_ORDER_TTL_MIN).toBe(ordersTs.DEFAULT_ORDER_TTL_MIN);
  });

  it("toCents/fromCents agree (incl float-noise values)", () => {
    const values = [...grossCases, 0.1 + 0.2, 19.999999999999996, 1.005, 1234.56];
    for (const v of values) {
      expect(vend.toCents(v), `toCents(${v})`).toBe(ordersTs.toCents(v));
      expect(vend.fromCents(vend.toCents(v))).toBe(ordersTs.fromCents(ordersTs.toCents(v)));
    }
  });

  it("parseTtlMin agrees on all edge inputs", () => {
    const inputs = [undefined, null, "", "0", 0, -5, "60", 90.5, "abc", NaN, Infinity];
    for (const raw of inputs) {
      expect(vend.parseTtlMin(raw), `parseTtlMin(${String(raw)})`).toBe(ordersTs.parseTtlMin(raw));
    }
  });

  it("allocateUniqueAmountCents agrees, including exhaustion", () => {
    const cases: Array<[number, number[]]> = [
      [1000, []],
      [1000, [1001]],
      [1000, [1001, 1002, 1005]],
      [1000, Array.from({ length: 99 }, (_, i) => 1001 + i)], // exhausted → null
      [0, []],
      [11.4, [12, 13]], // non-integer base cents get rounded
    ];
    for (const [base, taken] of cases) {
      expect(vend.allocateUniqueAmountCents(base, taken), `base=${base}`).toBe(
        ordersTs.allocateUniqueAmountCents(base, taken)
      );
    }
  });

  const scenarios: Array<{ name: string; delta: number; orders: ordersTs.OpenOrder[] }> = [
    { name: "no open orders", delta: 500, orders: [] },
    { name: "zero delta", delta: 0, orders: [{ id: "a", amountDueCents: 500 }] },
    { name: "negative delta", delta: -100, orders: [{ id: "a", amountDueCents: 500 }] },
    {
      name: "exact single match",
      delta: 1101,
      orders: [
        { id: "a", amountDueCents: 1101 },
        { id: "b", amountDueCents: 1102 },
      ],
    },
    {
      name: "unambiguous two-order subset",
      delta: 1101 + 2503,
      orders: [
        { id: "a", amountDueCents: 1101 },
        { id: "b", amountDueCents: 2503 },
        { id: "c", amountDueCents: 9901 },
      ],
    },
    {
      name: "ambiguous — two subsets explain the delta",
      delta: 300,
      orders: [
        { id: "a", amountDueCents: 100 },
        { id: "b", amountDueCents: 200 },
        { id: "c", amountDueCents: 300 },
      ],
    },
    {
      name: "no subset explains the delta",
      delta: 777,
      orders: [
        { id: "a", amountDueCents: 500 },
        { id: "b", amountDueCents: 1000 },
      ],
    },
    {
      name: "zero-amount orders filtered out",
      delta: 500,
      orders: [
        { id: "a", amountDueCents: 0 },
        { id: "b", amountDueCents: 500 },
      ],
    },
  ];

  it("matchDeltaToOrders agrees on curated scenarios", () => {
    for (const s of scenarios) {
      expect(vend.matchDeltaToOrders(s.delta, s.orders), s.name).toEqual(
        ordersTs.matchDeltaToOrders(s.delta, s.orders)
      );
    }
  });

  it("matchDeltaToOrders agrees under deterministic fuzz", () => {
    // Simple LCG so the fuzz is reproducible.
    let seed = 42;
    const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    for (let run = 0; run < 200; run++) {
      const n = 1 + Math.floor(rand() * 8);
      const orders = Array.from({ length: n }, (_, i) => ({
        id: `o${i}`,
        amountDueCents: 1 + Math.floor(rand() * 3000),
      }));
      const pickSum = orders
        .filter(() => rand() < 0.5)
        .reduce((acc, o) => acc + o.amountDueCents, 0);
      const delta = rand() < 0.5 ? pickSum : Math.floor(rand() * 6000);
      expect(vend.matchDeltaToOrders(delta, orders), `run ${run} delta=${delta}`).toEqual(
        ordersTs.matchDeltaToOrders(delta, orders)
      );
    }
  });
});
