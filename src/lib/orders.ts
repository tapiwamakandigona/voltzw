/** Semi-auto order math shared by the frontend and the vend function.
 *  NOTE: functions/vend/src/main.js has an identical CommonJS copy of these
 *  functions (the function bundle can't import TS) — keep them in sync,
 *  same pattern as fee.ts. All money math is done in INTEGER CENTS so
 *  matching against wallet-balance deltas is exact. */

export const ORDER_STATUSES = [
  "pending_payment",
  "vending",
  "complete",
  "needs_attention",
  "expired",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Statuses still waiting for the customer's money (eligible for matching). */
export const OPEN_STATUS = "pending_payment";

export const DEFAULT_ORDER_TTL_MIN = 60;

/** Convert a dollars number to integer cents (safe against float noise). */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

/** Parse ORDER_TTL_MIN-style value. Defaults to 60 when unset/invalid. */
export function parseTtlMin(raw: unknown): number {
  if (raw === undefined || raw === null || raw === "") return DEFAULT_ORDER_TTL_MIN;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_ORDER_TTL_MIN;
  return n;
}

/** Allocate a unique amount for a new order: base amount + the SMALLEST
 *  unused cents offset in 0.01–0.99, so every open order has a distinct
 *  exact amount and an incoming wallet-balance delta identifies exactly
 *  one order. Returns cents, or null when all 99 offsets around this base
 *  are taken (caller should ask the customer to retry later). */
export function allocateUniqueAmountCents(
  baseCents: number,
  openAmountsCents: number[]
): number | null {
  const taken = new Set(openAmountsCents.map((c) => Math.round(c)));
  for (let offset = 1; offset <= 99; offset++) {
    const candidate = Math.round(baseCents) + offset;
    if (!taken.has(candidate)) return candidate;
  }
  return null;
}

export type OpenOrder = { id: string; amountDueCents: number };

export type MatchResult = {
  /** Order ids to vend (delta explained exactly, unambiguously). */
  matched: string[];
  /** True when delta equals more than one distinct subset of open orders. */
  ambiguous: boolean;
  /** On ambiguity: every order appearing in at least one matching subset. */
  candidates: string[];
};

/** Match a positive wallet-balance delta (cents) against open orders.
 *
 *  - Exact single-order match wins immediately (amounts are unique, so at
 *    most one order can equal the delta — and a single payment is by far
 *    the most likely explanation even when some multi-order subset also
 *    sums to the same delta).
 *  - Otherwise we search for subsets of open orders that sum to the delta
 *    (two customers may pay within one polling interval). Only an
 *    UNAMBIGUOUS subset (exactly one) is vended; if several different
 *    subsets explain the delta we cannot know who paid, so we return all
 *    involved orders as candidates for needs_attention.
 *  - No subset → { matched: [], ambiguous: false, candidates: [] }.
 *
 *  Subset search is exact (DFS over sorted amounts with pruning) and open
 *  order counts are tiny (unique-cents allocation caps realistic volume),
 *  so this stays fast. maxOrders caps pathological inputs. */
export function matchDeltaToOrders(
  deltaCents: number,
  openOrders: OpenOrder[],
  maxOrders = 20
): MatchResult {
  const none: MatchResult = { matched: [], ambiguous: false, candidates: [] };
  const delta = Math.round(deltaCents);
  if (delta <= 0 || openOrders.length === 0) return none;

  const orders = openOrders
    .map((o) => ({ id: o.id, amountDueCents: Math.round(o.amountDueCents) }))
    .filter((o) => o.amountDueCents > 0)
    .slice(0, maxOrders)
    .sort((a, b) => a.amountDueCents - b.amountDueCents);

  // Fast path: exact single order.
  const exact = orders.filter((o) => o.amountDueCents === delta);
  if (exact.length === 1) return { matched: [exact[0].id], ambiguous: false, candidates: [] };

  // Subset-sum: collect up to 2 distinct subsets (enough to detect ambiguity).
  const found: string[][] = [];
  const suffixSums: number[] = new Array(orders.length + 1).fill(0);
  for (let i = orders.length - 1; i >= 0; i--) {
    suffixSums[i] = suffixSums[i + 1] + orders[i].amountDueCents;
  }
  const pick: string[] = [];
  function dfs(idx: number, remaining: number) {
    if (found.length >= 2) return;
    if (remaining === 0) {
      found.push([...pick]);
      return;
    }
    if (idx >= orders.length) return;
    if (remaining < orders[idx].amountDueCents) return; // sorted asc — nothing fits
    if (remaining > suffixSums[idx]) return; // not enough left even taking all
    // take
    pick.push(orders[idx].id);
    dfs(idx + 1, remaining - orders[idx].amountDueCents);
    pick.pop();
    // skip
    dfs(idx + 1, remaining);
  }
  dfs(0, delta);

  if (found.length === 1) return { matched: found[0], ambiguous: false, candidates: [] };
  if (found.length >= 2) {
    const candidates = [...new Set(found.flat())];
    return { matched: [], ambiguous: true, candidates };
  }
  return none;
}

/** True when a pending order has passed its expiry timestamp. */
export function isOrderExpired(expiresAtIso: string, nowMs: number): boolean {
  const t = Date.parse(expiresAtIso || "");
  if (!Number.isFinite(t)) return false; // malformed timestamp: never auto-expire
  return nowMs > t;
}

/** Robustly parse a Hot Recharge wallet-balance reply into cents.
 *  The API shape has varied ("WalletBalance", "Balance", string values with
 *  currency symbols/commas), so we check known keys in priority order and
 *  accept "ZWG 1,234.56"-style strings. Returns null when nothing parses. */
export function parseWalletBalanceCents(resp: unknown): number | null {
  if (resp === null || resp === undefined) return null;
  if (typeof resp === "number") return Number.isFinite(resp) ? toCents(resp) : null;
  if (typeof resp === "string") {
    const n = parseMoneyString(resp);
    return n === null ? null : toCents(n);
  }
  if (typeof resp !== "object") return null;
  const obj = resp as Record<string, unknown>;
  const keys = [
    "WalletBalance", "walletBalance", "wallet_balance",
    "Balance", "balance", "AvailableBalance", "availableBalance", "Amount",
  ];
  for (const k of keys) {
    if (!(k in obj)) continue;
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return toCents(v);
    if (typeof v === "string") {
      const n = parseMoneyString(v);
      if (n !== null) return toCents(n);
    }
  }
  return null;
}

function parseMoneyString(s: string): number | null {
  const cleaned = s.replace(/[^0-9.\-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Build the customer payment steps. `template` is the HOT_PAY_INSTRUCTIONS
 *  env value: a JSON array of strings with an `{amount}` placeholder.
 *  Falls back to generic EcoCash steps that pull merchant details from the
 *  provided values (never invents real merchant codes). */
export function buildInstructions(
  template: string | undefined,
  amountDisplay: string,
  merchant: { code?: string; name?: string } = {}
): string[] {
  if (template) {
    try {
      const arr = JSON.parse(template);
      if (Array.isArray(arr) && arr.every((s) => typeof s === "string") && arr.length > 0) {
        return arr.map((s) => s.replaceAll("{amount}", amountDisplay));
      }
    } catch { /* fall back below */ }
  }
  const code = merchant.code || "(merchant code — see SMS/WhatsApp confirmation)";
  const name = merchant.name || "Hot Recharge";
  return [
    `Open the EcoCash menu on your phone (dial *151#).`,
    `Choose Make Payment, then Pay Merchant.`,
    `Enter merchant code ${code} (${name}).`,
    `Pay EXACTLY ${amountDisplay} — the exact cents are how we match your payment to your meter.`,
    `Keep this page open. Your token appears here automatically, usually within a couple of minutes.`,
  ];
}
