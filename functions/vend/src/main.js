import { Client, TablesDB, ID, Query } from "node-appwrite";
import crypto from "node:crypto";

/* ---------------- Config ---------------- */

const HR_BASE = "https://ssl.hot.co.zw/api/v1/";
const PAYNOW_INITIATE = "https://www.paynow.co.zw/interface/initiatetransaction";
const DB_ID = "voltdb";
const TABLE = "transactions";
const WAITLIST = "waitlist";
const LOCKS = "vend_locks";
const ORDERS = "orders";
const KV = "kv";
const KV_LAST_BALANCE = "zesa_last_balance"; // kv row id + key; value = balance in CENTS
const SITE = process.env.SITE_URL || "https://zesa.tapiwa.me";
const LOCK_STALE_MS = 120_000; // consider a vend attempt dead after 2 min

const CURRENCIES = {
  USD: { id: process.env.PAYNOW_ID_USD, key: process.env.PAYNOW_KEY_USD },
  ZWG: { id: process.env.PAYNOW_ID_ZWG, key: process.env.PAYNOW_KEY_ZWG },
};

/* ---------------- Service fee ----------------
   Kept in sync with src/lib/fee.ts (frontend copy — the function bundle
   can't import TS). Fee is taken OUT of the gross amount the customer pays. */

const DEFAULT_FEE_PCT = 10;

// Default 10 when unset/invalid; 0 is valid (fee disabled).
function parseFeePct(raw) {
  if (raw === undefined || raw === null || raw === "") return DEFAULT_FEE_PCT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_FEE_PCT;
  return n;
}

function tokenValueForGross(gross, feePct) {
  return Math.round((gross / (1 + feePct / 100)) * 100) / 100;
}

/* ---------------- Payment mode ----------------
   coming_soon → waitlist only, semi_auto → customer funds the Hot Recharge
   wallet directly (this file reconciles + vends), paynow → hosted checkout. */

const PAYMENT_MODES = ["coming_soon", "semi_auto", "paynow"];

function paymentMode() {
  const m = (process.env.PAYMENT_MODE || "").toLowerCase();
  return PAYMENT_MODES.includes(m) ? m : "coming_soon";
}

/* ---------------- Semi-auto order math ----------------
   Kept in sync with src/lib/orders.ts (frontend copy — the function bundle
   can't import TS), same pattern as fee.ts above. All money math is done in
   INTEGER CENTS so matching against wallet-balance deltas is exact. */

const DEFAULT_ORDER_TTL_MIN = 60;

function toCents(amount) {
  return Math.round(amount * 100);
}

function fromCents(cents) {
  return Math.round(cents) / 100;
}

// Default 60 when unset/invalid.
function parseTtlMin(raw) {
  if (raw === undefined || raw === null || raw === "") return DEFAULT_ORDER_TTL_MIN;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_ORDER_TTL_MIN;
  return n;
}

// Allocate base + smallest unused cents offset (0.01–0.99) so every open
// order has a distinct exact amount. Returns cents, or null when exhausted.
function allocateUniqueAmountCents(baseCents, openAmountsCents) {
  const taken = new Set(openAmountsCents.map((c) => Math.round(c)));
  for (let offset = 1; offset <= 99; offset++) {
    const candidate = Math.round(baseCents) + offset;
    if (!taken.has(candidate)) return candidate;
  }
  return null;
}

// Match a positive wallet-balance delta (cents) against open orders.
// Exact single order wins; otherwise only an UNAMBIGUOUS subset (exactly
// one subset summing to delta) is vended; multiple subsets → ambiguous with
// all involved orders as candidates. See src/lib/orders.ts for full notes.
function matchDeltaToOrders(deltaCents, openOrders, maxOrders = 50) {
  const none = { matched: [], ambiguous: false, candidates: [], truncated: false };
  const delta = Math.round(deltaCents);
  if (delta <= 0 || openOrders.length === 0) return none;

  const fullBook = openOrders
    .map((o) => ({ id: o.id, amountDueCents: Math.round(o.amountDueCents) }))
    .filter((o) => o.amountDueCents > 0);

  // Fast path: exact single order — checked against the FULL book so a
  // payment for an order beyond the cap still matches.
  const exact = fullBook.filter((o) => o.amountDueCents === delta);
  if (exact.length === 1) {
    return { matched: [exact[0].id], ambiguous: false, candidates: [], truncated: false };
  }

  // Subset search runs on a capped book: sort FIRST, then truncate.
  const truncated = fullBook.length > maxOrders;
  const orders = [...fullBook]
    .sort((a, b) => a.amountDueCents - b.amountDueCents)
    .slice(0, maxOrders);

  const found = [];
  const suffixSums = new Array(orders.length + 1).fill(0);
  for (let i = orders.length - 1; i >= 0; i--) {
    suffixSums[i] = suffixSums[i + 1] + orders[i].amountDueCents;
  }
  const pick = [];
  function dfs(idx, remaining) {
    if (found.length >= 2) return;
    if (remaining === 0) { found.push([...pick]); return; }
    if (idx >= orders.length) return;
    if (remaining < orders[idx].amountDueCents) return;
    if (remaining > suffixSums[idx]) return;
    pick.push(orders[idx].id);
    dfs(idx + 1, remaining - orders[idx].amountDueCents);
    pick.pop();
    dfs(idx + 1, remaining);
  }
  dfs(0, delta);

  if (found.length === 1) return { matched: found[0], ambiguous: false, candidates: [], truncated };
  if (found.length >= 2) {
    return { matched: [], ambiguous: true, candidates: [...new Set(found.flat())], truncated };
  }
  return { ...none, truncated };
}

function isOrderExpired(expiresAtIso, nowMs) {
  const t = Date.parse(expiresAtIso || "");
  if (!Number.isFinite(t)) return false;
  return nowMs > t;
}

// Robustly parse a Hot Recharge wallet-balance reply into cents.
function parseWalletBalanceCents(resp) {
  if (resp === null || resp === undefined) return null;
  if (typeof resp === "number") return Number.isFinite(resp) ? toCents(resp) : null;
  if (typeof resp === "string") {
    const n = parseMoneyString(resp);
    return n === null ? null : toCents(n);
  }
  if (typeof resp !== "object") return null;
  const keys = [
    "WalletBalance", "walletBalance", "wallet_balance",
    "Balance", "balance", "AvailableBalance", "availableBalance", "Amount",
  ];
  for (const k of keys) {
    if (!(k in resp)) continue;
    const v = resp[k];
    if (typeof v === "number" && Number.isFinite(v)) return toCents(v);
    if (typeof v === "string") {
      const n = parseMoneyString(v);
      if (n !== null) return toCents(n);
    }
  }
  return null;
}

function parseMoneyString(s) {
  const cleaned = s.replace(/[^0-9.\-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Customer payment steps: HOT_PAY_INSTRUCTIONS env (JSON array of strings,
// {amount} placeholder) or generic EcoCash defaults built from env merchant
// details — never invents real merchant codes.
function buildInstructions(template, amountDisplay, merchant = {}) {
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

/* ---- end of src/lib/orders.ts mirror ---- */

function isConfigured() {
  return Boolean(
    process.env.HR_ACCESS_CODE &&
    process.env.HR_ACCESS_PASSWORD &&
    CURRENCIES.USD.id && CURRENCIES.USD.key &&
    CURRENCIES.ZWG.id && CURRENCIES.ZWG.key
  );
}

/* ---------------- Alerts (optional webhook) ---------------- */

async function alert(text) {
  const url = process.env.ALERT_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `[VoltZW] ${text}` }),
    });
  } catch { /* never let alerting break the flow */ }
}

/* ---------------- Hot Recharge ---------------- */

function hrHeaders(agentReference) {
  return {
    "Content-Type": "application/json",
    "x-access-code": process.env.HR_ACCESS_CODE,
    "x-access-password": process.env.HR_ACCESS_PASSWORD,
    "x-agent-reference": agentReference || crypto.randomUUID().replaceAll("-", "").slice(0, 24),
  };
}

async function hrPost(path, body, agentReference) {
  const res = await fetch(HR_BASE + path, {
    method: "POST",
    headers: hrHeaders(agentReference),
    body: JSON.stringify(body),
  });
  return res.json();
}

async function hrGet(path) {
  const res = await fetch(HR_BASE + path, { method: "GET", headers: hrHeaders() });
  return res.json();
}

async function hrCheckMeter(meter) {
  return hrPost("agents/check-customer-zesa", { MeterNumber: meter });
}

async function hrVend(amount, meter, notifyPhone, agentReference) {
  return hrPost("agents/recharge-zesa", {
    Amount: amount,
    meterNumber: meter,
    TargetNumber: notifyPhone,
  }, agentReference);
}

// ZESA vends can land in "pending verification" (ReplyCode 4). Query by RechargeId.
async function hrQueryZesa(rechargeId) {
  return hrPost("agents/query-zesa-transaction", { RechargeId: rechargeId });
}

/* ---------------- Paynow ---------------- */

function paynowHash(values, integrationKey) {
  const str = values.join("") + integrationKey;
  return crypto.createHash("sha512").update(str, "utf8").digest("hex").toUpperCase();
}

function parseUrlEncoded(text) {
  const out = {};
  for (const [k, v] of new URLSearchParams(text)) out[k.toLowerCase()] = v;
  return out;
}

async function paynowInitiate({ ref, amount, currency, email }) {
  const conf = CURRENCIES[currency];
  const fields = [
    ["id", conf.id],
    ["reference", ref],
    ["amount", amount.toFixed(2)],
    ["additionalinfo", `VoltZW electricity token (${currency})`],
    ["returnurl", `${SITE}/buy/status/?ref=${ref}`],
    ["resulturl", `${process.env.FN_URL}/result?ref=${ref}`],
    ["authemail", email || ""],
    ["status", "Message"],
  ];
  const hash = paynowHash(fields.map(([, v]) => v), conf.key);
  const body = new URLSearchParams([...fields, ["hash", hash]]);
  const res = await fetch(PAYNOW_INITIATE, { method: "POST", body });
  const data = parseUrlEncoded(await res.text());
  if ((data.status || "").toLowerCase() !== "ok") {
    throw new Error(data.error || "Paynow initiation failed");
  }
  return { browserUrl: data.browserurl, pollUrl: data.pollurl };
}

async function paynowPoll(pollUrl) {
  // Transient "TypeError: fetch failed" here used to 500 /status — retry briefly.
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 300 * attempt));
    try {
      const res = await fetch(pollUrl, { method: "POST" });
      return parseUrlEncoded(await res.text());
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

/* ---------------- Helpers ---------------- */

// Accept 07XXXXXXXX, +2637XXXXXXXX, 002637XXXXXXXX, 2637XXXXXXXX (spaces/dashes ok).
function normalizePhone(raw) {
  const p = String(raw || "").replace(/[\s\-().]/g, "");
  let m = p.match(/^(?:\+|00)?263(7\d{8})$/);
  if (m) return "0" + m[1];
  if (/^07\d{8}$/.test(p)) return p;
  return null;
}

function makeRef() {
  // 12 hex chars of real randomness (2^48) — refs gate token retrieval, keep them unguessable.
  return "VZ" + crypto.randomBytes(6).toString("hex").toUpperCase();
}

// The Hot Recharge ZESA wallet is single-currency (payload has no currency field).
// If the payment currency differs from the wallet currency, convert using the
// same live FX approximation the site publishes.
async function toVendAmount(amount, txCurrency, log) {
  const wallet = (process.env.HR_WALLET_CURRENCY || "").toUpperCase();
  if (!wallet || wallet === txCurrency) {
    if (!wallet) log(`HR_WALLET_CURRENCY not set — vending ${txCurrency} amount as-is`);
    return amount;
  }
  const res = await fetch(`${SITE}/api/tariffs.json`);
  const t = await res.json();
  const rate = Number(t.zwgPerUsdApprox);
  if (!(rate > 0)) throw new Error("Cannot convert vend amount: bad FX rate");
  const converted = txCurrency === "USD" && wallet === "ZWG"
    ? amount * rate
    : txCurrency === "ZWG" && wallet === "USD"
      ? amount / rate
      : amount;
  return Math.round(converted * 100) / 100;
}

/* ---------------- Vend (atomic, retryable) ---------------- */

// Lock via createRow with a fixed row ID — the second concurrent creator gets a
// conflict, which makes this safe against the /status + /result race.
async function acquireLock(db, ref) {
  const rowId = ref.toLowerCase();
  try {
    await db.createRow(DB_ID, LOCKS, rowId, { ref });
    return true;
  } catch {
    try {
      const row = await db.getRow(DB_ID, LOCKS, rowId);
      if (Date.now() - new Date(row.$createdAt).getTime() > LOCK_STALE_MS) {
        await db.deleteRow(DB_ID, LOCKS, rowId);
        await db.createRow(DB_ID, LOCKS, rowId, { ref });
        return true; // previous attempt died — take over
      }
    } catch { /* fall through */ }
    return false;
  }
}

async function releaseLock(db, ref) {
  try { await db.deleteRow(DB_ID, LOCKS, ref.toLowerCase()); } catch { /* ok */ }
}

async function finalizeVend(db, tx, vr, json, error) {
  if (vr.ReplyCode === 2 || vr.ReplyCode === "2") {
    const t = vr.Tokens?.[0] || {};
    await db.updateRow(DB_ID, TABLE, tx.$id, {
      status: "delivered",
      token: String(t.Token || ""),
      units: Number(t.Units || 0),
    });
    await releaseLock(db, tx.ref);
    return json({ ok: true, status: "delivered", token: String(t.Token || ""), units: Number(t.Units || 0), meter: tx.meter });
  }
  if (vr.ReplyCode === 4 || vr.ReplyCode === "4") {
    // Pending on ZETDC's side — keep polling via query-zesa-transaction. Never re-vend.
    await db.updateRow(DB_ID, TABLE, tx.$id, {
      status: "vend_pending",
      hrRef: String(vr.RechargeId ?? vr.RechargeID ?? tx.hrRef ?? ""),
    });
    await releaseLock(db, tx.ref);
    return json({ ok: true, status: "processing" });
  }
  // Hot Recharge errors don't always populate ReplyMsg — fall back to Message,
  // then the raw reply, so we never log "undefined".
  const replyMsg = vr.ReplyMsg || vr.Message || JSON.stringify(vr);
  const replyDetail = `code=${vr.ReplyCode ?? "?"} ${replyMsg}`;
  await db.updateRow(DB_ID, TABLE, tx.$id, {
    status: "vend_failed",
    lastError: String(replyDetail || "vend error").slice(0, 1000),
  });
  await releaseLock(db, tx.ref);
  error(`vend failed ref=${tx.ref}: ${replyDetail}`);
  await alert(`VEND FAILED ref=${tx.ref} meter=${tx.meter} ${tx.currency} ${tx.amount}: ${replyDetail}`);
  return json({ ok: true, status: "vend_failed", meter: tx.meter });
}

async function attemptVend(db, tx, json, log, error) {
  if (!(await acquireLock(db, tx.ref))) {
    return json({ ok: true, status: "processing" }); // someone else is vending right now
  }
  // Stable agent reference per transaction: retries reuse it so Hot Recharge can
  // deduplicate instead of double-vending.
  const agentRef = tx.hrRef || crypto.randomUUID().replaceAll("-", "").slice(0, 24);
  await db.updateRow(DB_ID, TABLE, tx.$id, { status: "paid_vending", hrRef: agentRef });
  let vr;
  try {
    // Vend the token value (gross minus service fee); older rows have no tokenValue.
    const tokenValue = Number(tx.tokenValue) > 0 ? Number(tx.tokenValue) : tx.amount;
    const vendAmount = await toVendAmount(tokenValue, tx.currency, log);
    log(`vend ref=${tx.ref} paid=${tx.currency} ${tx.amount} tokenValue=${tokenValue} vendAmount=${vendAmount}`);
    vr = await hrVend(vendAmount, tx.meter, tx.phone, agentRef);
  } catch (e) {
    // Network/timeout mid-vend: leave lock (it goes stale in 2 min) so a later
    // poll retries with the SAME agentRef instead of stranding the customer.
    error(`vend attempt errored ref=${tx.ref}: ${e}`);
    await alert(`VEND ATTEMPT ERRORED ref=${tx.ref} (will auto-retry): ${e}`);
    return json({ ok: true, status: "processing" });
  }
  return finalizeVend(db, tx, vr, json, error);
}

/* ---------------- Semi-auto orders (customer funds the HR wallet) ---------------- */

// Interpret a Hot Recharge vend/query reply into a small outcome object so the
// transactions flow (finalizeVend above) and the orders flow share one brain.
function parseVendReply(vr) {
  if (vr.ReplyCode === 2 || vr.ReplyCode === "2") {
    const t = vr.Tokens?.[0] || {};
    return { outcome: "delivered", token: String(t.Token || ""), units: Number(t.Units || 0), raw: t };
  }
  if (vr.ReplyCode === 4 || vr.ReplyCode === "4") {
    return { outcome: "pending", rechargeId: String(vr.RechargeId ?? vr.RechargeID ?? "") };
  }
  const replyMsg = vr.ReplyMsg || vr.Message || JSON.stringify(vr);
  return { outcome: "failed", detail: `code=${vr.ReplyCode ?? "?"} ${replyMsg}` };
}

async function completeOrder(db, order, parsed, error) {
  const receipt = JSON.stringify(parsed.raw || {}).slice(0, 1000);
  await db.updateRow(DB_ID, ORDERS, order.$id, {
    status: "complete",
    token: parsed.token,
    units: parsed.units,
    receipt,
    note: "",
  });
  // Mirror into transactions so reporting/history stays in one place. Never
  // let a schema mismatch here strand a completed order.
  try {
    const feePct = Number(order.feePct) || 0;
    await db.createRow(DB_ID, TABLE, ID.unique(), {
      ref: order.ref,
      meter: order.meter,
      amount: Number(order.amountDue),
      currency: order.currency,
      feePct,
      tokenValue: Number(order.tokenValue),
      phone: order.phone,
      email: order.email || "",
      customerName: "",
      status: "delivered",
      pollUrl: "",
      hrRef: order.hrRef || "",
      token: parsed.token,
      units: parsed.units,
    });
  } catch (e) {
    error(`orders→transactions mirror failed ref=${order.ref}: ${e}`);
  }
  await releaseLock(db, order.ref);
}

async function failOrderNeedsAttention(db, order, note, error) {
  await db.updateRow(DB_ID, ORDERS, order.$id, {
    status: "needs_attention",
    note: String(note || "unknown error").slice(0, 1000),
  });
  await releaseLock(db, order.ref);
  error(`order needs attention ref=${order.ref}: ${note}`);
  await alert(`ORDER NEEDS ATTENTION ref=${order.ref} meter=${order.meter} ${order.currency} ${order.amountDue}: ${note}`);
}

// Vend one matched (money received!) order. Returns the wallet-currency cents
// we are CONFIDENT were deducted from the wallet by this call (used for the
// balance-baseline bookkeeping in reconcile — see notes there).
async function vendOrder(db, order, log, error) {
  if (!(await acquireLock(db, order.ref))) return 0; // another run is on it
  const isRetry = Boolean(order.hrRef);
  const agentRef = order.hrRef || crypto.randomUUID().replaceAll("-", "").slice(0, 24);
  // Persist agentRef BEFORE vending so a crash mid-vend retries with the same
  // reference and Hot Recharge can deduplicate instead of double-vending.
  await db.updateRow(DB_ID, ORDERS, order.$id, { status: "vending", hrRef: agentRef });
  let vr, vendAmount;
  try {
    vendAmount = await toVendAmount(Number(order.tokenValue), order.currency, log);
    log(`order vend ref=${order.ref} due=${order.currency} ${order.amountDue} tokenValue=${order.tokenValue} vendAmount=${vendAmount}`);
    vr = await hrVend(vendAmount, order.meter, order.phone, agentRef);
  } catch (e) {
    // Network death mid-vend: leave the lock (stale in 2 min); the next
    // reconcile retries with the SAME agentRef. Money is already in the
    // wallet, so never mark failed for a transient error.
    error(`order vend attempt errored ref=${order.ref} (will retry): ${e}`);
    await alert(`ORDER VEND ERRORED ref=${order.ref} (auto-retry next poll): ${e}`);
    return 0;
  }
  const parsed = parseVendReply(vr);
  if (parsed.outcome === "delivered") {
    await completeOrder(db, order, parsed, error);
    // Retries may have deducted in an earlier attempt — only count first
    // attempts, and undercount rather than overcount (see reconcile notes).
    return isRetry ? 0 : toCents(vendAmount);
  }
  if (parsed.outcome === "pending") {
    // ZETDC-side pending: store RechargeId separately and keep polling via
    // query-zesa-transaction. Never re-vend a pending recharge.
    await db.updateRow(DB_ID, ORDERS, order.$id, { status: "vending", hrQueryId: parsed.rechargeId });
    await releaseLock(db, order.ref);
    return isRetry ? 0 : toCents(vendAmount); // vend registered → wallet debited
  }
  // Hard vend failure with the customer's money already received.
  await failOrderNeedsAttention(db, order, `vend failed: ${parsed.detail}`, error);
  return 0;
}

// Resume orders stuck in "vending" from a previous run.
async function resumeVendingOrder(db, order, log, error) {
  if (order.hrQueryId) {
    // Pending on ZETDC's side — query, never re-vend.
    const qr = await hrQueryZesa(order.hrQueryId);
    const parsed = parseVendReply(qr);
    if (parsed.outcome === "delivered") {
      await completeOrder(db, order, parsed, error);
    } else if (parsed.outcome === "failed") {
      await failOrderNeedsAttention(db, order, `zesa query failed: ${parsed.detail}`, error);
    }
    // still pending → leave as-is, poll again next run
    return 0;
  }
  // Vend attempt died mid-flight — retry with the stored agentRef (the vend
  // lock gates concurrency; a stale lock is taken over after 2 min).
  return vendOrder(db, order, log, error);
}

/* Reconcile: detect wallet top-ups and vend matching orders.
 *
 * Balance-baseline bookkeeping — the race between incoming payments and our
 * own vend deductions:
 *   1. We fetch `balance` once at the start; delta = balance - lastBalance
 *      captures customer payments that landed since the previous run.
 *   2. Our vends then REDUCE the balance while the run executes, and new
 *      payments may ARRIVE mid-run. If we simply persisted a re-fetched
 *      balance, those mid-run payments would be absorbed into the baseline
 *      and silently lost.
 *   3. So we track expected = balance - (confident vend deductions) and
 *      re-fetch actual at the end, then persist min(actual, expected):
 *        - actual > expected → a payment arrived mid-run → keep the smaller
 *          expected so the next run sees that payment as a fresh delta.
 *        - actual < expected → vends cost more than we accounted for (fees,
 *          a retry that deducted, an owner action) → resync down to actual;
 *          erring low can only delay a match, never fake one.
 *      Overcounting deductions is the dangerous direction (it would create
 *      phantom positive deltas that could falsely match an order), which is
 *      why vendOrder only reports deductions it is confident about.
 */
async function reconcile(db, log, error) {
  if (paymentMode() !== "semi_auto") return { ok: true, skipped: "payment mode is not semi_auto" };

  const balResp = await hrGet("agents/wallet-balance-zesa");
  const balanceCents = parseWalletBalanceCents(balResp);
  if (balanceCents === null) {
    error(`reconcile: cannot parse wallet balance: ${JSON.stringify(balResp)}`);
    await alert(`RECONCILE: cannot parse ZESA wallet balance reply`);
    return { ok: false, error: "unparseable wallet balance" };
  }

  // Load (or initialize) the baseline.
  let kvRow = null;
  try { kvRow = await db.getRow(DB_ID, KV, KV_LAST_BALANCE); } catch { /* missing */ }
  if (!kvRow) {
    await db.createRow(DB_ID, KV, KV_LAST_BALANCE, {
      key: KV_LAST_BALANCE,
      value: String(balanceCents),
    });
    log(`reconcile: baseline initialized at ${fromCents(balanceCents)}`);
    return { ok: true, initialized: fromCents(balanceCents) };
  }
  const lastCents = Math.round(Number(kvRow.value));
  if (!Number.isFinite(lastCents)) {
    await db.updateRow(DB_ID, KV, kvRow.$id, { value: String(balanceCents) });
    return { ok: true, reset: "baseline was corrupt — reinitialized" };
  }

  const now = Date.now();
  const summary = { ok: true, balance: fromCents(balanceCents), delta: fromCents(balanceCents - lastCents), vended: 0, resumed: 0, expired: 0, ambiguous: 0, unmatchedDelta: 0 };
  let vendDeductCents = 0;

  // 1. Resume orders stuck in "vending" (pending ZETDC verification or a
  //    crashed vend attempt) BEFORE matching, so their deductions are settled.
  const vendingRows = await db.listRows(DB_ID, ORDERS, [
    Query.equal("status", "vending"), Query.limit(50),
  ]);
  for (const order of vendingRows.rows) {
    vendDeductCents += await resumeVendingOrder(db, order, log, error);
    summary.resumed++;
  }

  // 2. Load the open order book.
  const openRows = await db.listRows(DB_ID, ORDERS, [
    Query.equal("status", "pending_payment"), Query.orderAsc("$createdAt"), Query.limit(100),
  ]);
  const open = openRows.rows;

  // 3. Match the delta to orders and vend.
  const deltaCents = balanceCents - lastCents;
  if (deltaCents > 0 && open.length > 0) {
    const book = open.map((o) => ({ id: o.$id, amountDueCents: Math.round(Number(o.amountDueCents)) }));
    const smallest = Math.min(...book.map((b) => b.amountDueCents));
    if (deltaCents >= smallest) {
      const match = matchDeltaToOrders(deltaCents, book);
      if (match.matched.length > 0) {
        for (const id of match.matched) {
          const order = open.find((o) => o.$id === id);
          vendDeductCents += await vendOrder(db, order, log, error);
          summary.vended++;
        }
      } else if (match.ambiguous) {
        // We cannot tell who paid — flag every plausible order for the owner
        // and still advance the baseline so the delta isn't re-processed.
        for (const id of match.candidates) {
          const order = open.find((o) => o.$id === id);
          await failOrderNeedsAttention(
            db, order,
            `ambiguous payment match: wallet delta ${fromCents(deltaCents)} fits multiple order combinations`,
            error
          );
          summary.ambiguous++;
        }
      } else {
        // Money arrived that matches no order (wrong amount paid, owner
        // top-up, HR adjustment). Alert and advance the baseline; wrongly
        // paid customers surface via the alert + /admin/orders + expiry.
        summary.unmatchedDelta = fromCents(deltaCents);
        await alert(`RECONCILE: unmatched wallet delta ${fromCents(deltaCents)} (open orders: ${open.length}) — money received that fits no order`);
      }
    }
  } else if (deltaCents > 0) {
    // Balance rose with no open orders (owner top-up) — just advance.
    log(`reconcile: balance rose ${fromCents(deltaCents)} with no open orders`);
  } else if (deltaCents < 0) {
    // Balance dropped outside our vends (owner vended elsewhere, HR fees) —
    // resync; erring low is safe.
    log(`reconcile: balance dropped ${fromCents(-deltaCents)} outside this flow — resyncing baseline`);
  }

  // 4. Expire stale pending orders (after matching, so a payment landing at
  //    the buzzer still gets its token).
  const ttlMin = parseTtlMin(process.env.ORDER_TTL_MIN);
  for (const order of open) {
    const row = await db.getRow(DB_ID, ORDERS, order.$id).catch(() => null);
    if (!row || row.status !== "pending_payment") continue; // matched above
    // Prefer the expiresAt the customer was shown; fall back to createdAt+TTL.
    const expiresAt = row.expiresAt
      || new Date(Date.parse(row.$createdAt) + ttlMin * 60_000).toISOString();
    if (isOrderExpired(expiresAt, now)) {
      await db.updateRow(DB_ID, ORDERS, order.$id, { status: "expired" });
      summary.expired++;
    }
  }

  // 5. Persist the new baseline (see the race notes above).
  const expectedCents = balanceCents - vendDeductCents;
  let finalCents = expectedCents;
  try {
    const after = parseWalletBalanceCents(await hrGet("agents/wallet-balance-zesa"));
    if (after !== null) finalCents = Math.min(after, expectedCents);
  } catch { /* keep expected */ }
  await db.updateRow(DB_ID, KV, kvRow.$id, { value: String(finalCents) });
  summary.newBaseline = fromCents(finalCents);
  log(`reconcile: ${JSON.stringify(summary)}`);
  return summary;
}

/* ---------------- Handler ---------------- */

/* CORS: only the site itself (and localhost for dev) may make browser
   requests — previously `*`, which let any origin call the admin routes
   with a stolen key from the browser. Note this is defense-in-depth, not
   auth: non-browser clients ignore CORS entirely, so ADMIN_KEY remains
   the real gate on admin routes. */
const ALLOWED_ORIGINS = [SITE, "http://localhost:3000"];

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : SITE,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
    Vary: "Origin",
  };
}

const handler = async ({ req, res, log, error }) => {
  const cors = corsHeaders(req.headers.origin || "");
  if (req.method === "OPTIONS") return res.text("", 204, cors);

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers["x-appwrite-key"] || "");
  const db = new TablesDB(client);

  const path = (req.path || "/").replace(/\/+$/, "") || "/";
  const json = (obj, code = 200) => res.json(obj, code, cors);

  try {
    /* ---- scheduled reconcile (Appwrite cron) ---- */
    if (req.headers["x-appwrite-trigger"] === "schedule") {
      return json(await reconcile(db, log, error));
    }

    /* ---- health / config check ---- */
    if (path === "/health") {
      return json({
        ok: true,
        configured: isConfigured(),
        paymentMode: paymentMode(),
        feePct: parseFeePct(process.env.SERVICE_FEE_PCT),
      });
    }

    /* ---- manual reconcile trigger (requires ADMIN_KEY) ---- */
    if (path === "/poll" && req.method === "POST") {
      if (!process.env.ADMIN_KEY || req.headers["x-admin-key"] !== process.env.ADMIN_KEY) {
        return json({ ok: false, error: "Not found." }, 404);
      }
      return json(await reconcile(db, log, error));
    }

    /* ---- admin: wallet balances (requires ADMIN_KEY) ---- */
    if (path === "/wallet") {
      if (!process.env.ADMIN_KEY || req.headers["x-admin-key"] !== process.env.ADMIN_KEY) {
        return json({ ok: false, error: "Not found." }, 404);
      }
      const [zesa, main] = await Promise.all([
        hrGet("agents/wallet-balance-zesa"),
        hrGet("agents/wallet-balance"),
      ]);
      return json({ ok: true, zesa, main });
    }

    /* ---- meter lookup ---- */
    if (path === "/check-meter" && req.method === "POST") {
      const { meter } = req.bodyJson || {};
      if (!/^\d{9,13}$/.test(meter || "")) {
        return json({ ok: false, error: "Enter a valid meter number (9–13 digits)." }, 400);
      }
      const r = await hrCheckMeter(meter);
      if (r.ReplyCode === 2 || r.ReplyCode === "2") {
        return json({
          ok: true,
          customerName: (r.CustomerInfo?.CustomerName || r.AccountName || "").trim(),
          address: (r.CustomerInfo?.Address || r.Address || "").trim(),
        });
      }
      return json({
        ok: false,
        error: r.ReplyMsg || "Meter not found. Double-check the number.",
      }, 404);
    }

    /* ---- launch waitlist (pre-launch interest capture) ---- */
    if (path === "/waitlist" && req.method === "POST") {
      const { meter, phone, email, currency, amount } = req.bodyJson || {};
      try {
        await db.createRow(DB_ID, WAITLIST, ID.unique(), {
          meter: String(meter || "").slice(0, 20),
          phone: String(phone || "").slice(0, 20),
          email: String(email || "").slice(0, 320),
          currency: String(currency || "").slice(0, 10),
          amount: Number(amount) || 0,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        // Table may not exist yet — never let the waitlist break the UI.
        error(`waitlist write failed: ${e}`);
      }
      return json({ ok: true });
    }

    /* ---- semi-auto: create an order (customer pays the HR wallet directly) ---- */
    if (path === "/order" && req.method === "POST") {
      if (paymentMode() !== "semi_auto") {
        return json({ ok: false, error: "Direct EcoCash orders are not available right now." }, 503);
      }
      if (!process.env.HR_ACCESS_CODE || !process.env.HR_ACCESS_PASSWORD) {
        return json({ ok: false, error: "Payments are not live yet — launching soon!" }, 503);
      }
      const { meter, phone, email, currency, amount } = req.bodyJson || {};
      const amt = Number(amount);
      if (!/^\d{9,13}$/.test(meter || "")) return json({ ok: false, error: "Invalid meter number." }, 400);
      if (currency !== "USD" && currency !== "ZWG") return json({ ok: false, error: "Invalid currency." }, 400);
      if (!(amt > 0) || amt > 10000) return json({ ok: false, error: "Invalid amount." }, 400);
      const normPhone = normalizePhone(phone);
      if (!normPhone) return json({ ok: false, error: "Enter a valid Zimbabwe mobile (07… or +2637…)." }, 400);
      // Matching compares the paid amount against the HR wallet balance, which
      // is single-currency — only accept orders in the wallet's currency.
      const walletCur = (process.env.HR_WALLET_CURRENCY || "").toUpperCase();
      if (walletCur && walletCur !== currency) {
        return json({ ok: false, error: `Direct EcoCash payment is currently ${walletCur}-only. Please switch currency.` }, 400);
      }

      const feePct = parseFeePct(process.env.SERVICE_FEE_PCT);
      const tokenValue = tokenValueForGross(amt, feePct);

      // Unique-cents allocation: every open order gets a distinct exact amount
      // so a wallet-balance delta identifies exactly one order.
      const openRows = await db.listRows(DB_ID, ORDERS, [
        Query.equal("status", "pending_payment"), Query.limit(200),
      ]);
      const openCents = openRows.rows.map((o) => Math.round(Number(o.amountDueCents)));
      const amountDueCents = allocateUniqueAmountCents(toCents(amt), openCents);
      if (amountDueCents === null) {
        return json({ ok: false, error: "Too many pending orders for this amount right now — please try again in a few minutes." }, 503);
      }
      const amountDue = fromCents(amountDueCents);

      const ref = makeRef();
      const ttlMin = parseTtlMin(process.env.ORDER_TTL_MIN);
      const expiresAt = new Date(Date.now() + ttlMin * 60_000).toISOString();
      await db.createRow(DB_ID, ORDERS, ID.unique(), {
        ref, meter, phone: normPhone, email: email || "",
        currency, amountRequested: amt, feePct, tokenValue,
        amountDue, amountDueCents, status: "pending_payment",
        expiresAt, token: "", units: 0, receipt: "", note: "",
        hrRef: "", hrQueryId: "",
      });

      const amountDisplay = currency === "USD" ? `$${amountDue.toFixed(2)}` : `ZWG ${amountDue.toFixed(2)}`;
      const instructions = buildInstructions(
        process.env.HOT_PAY_INSTRUCTIONS,
        amountDisplay,
        { code: process.env.HOT_MERCHANT_CODE, name: process.env.HOT_MERCHANT_NAME }
      );
      return json({ ok: true, orderId: ref, amountDue, currency, expiresAt, instructions });
    }

    /* ---- semi-auto: order status poll ---- */
    if (path === "/order-status") {
      const id = req.query?.id;
      if (!id) return json({ ok: false, error: "Missing id." }, 400);
      const rows = await db.listRows(DB_ID, ORDERS, [Query.equal("ref", id)]);
      if (rows.total === 0) return json({ ok: false, status: "not_found", error: "Order not found." }, 404);
      const o = rows.rows[0];
      // Treat overdue-but-unswept orders as pending until the reconciler
      // formally expires them (a payment at the buzzer still wins).
      const out = {
        ok: true,
        status: o.status,
        amountDue: Number(o.amountDue),
        currency: o.currency,
        expiresAt: o.expiresAt,
        meter: o.meter,
      };
      if (o.status === "complete") {
        out.token = o.token;
        out.units = Number(o.units) || 0;
        out.receipt = o.receipt || "";
      }
      return json(out);
    }

    /* ---- admin: order book (requires ADMIN_KEY) ---- */
    if (path === "/admin/orders") {
      if (!process.env.ADMIN_KEY || req.headers["x-admin-key"] !== process.env.ADMIN_KEY) {
        return json({ ok: false, error: "Not found." }, 404);
      }
      const rows = await db.listRows(DB_ID, ORDERS, [
        Query.orderDesc("$createdAt"), Query.limit(50),
      ]);
      const statuses = ["pending_payment", "vending", "complete", "needs_attention", "expired"];
      const counts = {};
      await Promise.all(statuses.map(async (s) => {
        const r = await db.listRows(DB_ID, ORDERS, [Query.equal("status", s), Query.limit(1)]);
        counts[s] = r.total;
      }));
      const orders = rows.rows.map((o) => ({
        id: o.$id, ref: o.ref, createdAt: o.$createdAt, status: o.status,
        meter: o.meter, phone: o.phone, email: o.email, currency: o.currency,
        amountRequested: o.amountRequested, amountDue: o.amountDue,
        tokenValue: o.tokenValue, expiresAt: o.expiresAt,
        token: o.token, units: o.units, note: o.note, hrRef: o.hrRef, hrQueryId: o.hrQueryId,
      }));
      return json({ ok: true, orders, counts });
    }

    /* ---- start payment ---- */
    if (path === "/initiate" && req.method === "POST") {
      if (!isConfigured()) {
        return json({ ok: false, error: "Payments are not live yet — launching soon!" }, 503);
      }
      const { meter, amount, currency, phone, email, customerName } = req.bodyJson || {};
      const amt = Number(amount);
      if (!/^\d{9,13}$/.test(meter || "")) return json({ ok: false, error: "Invalid meter number." }, 400);
      if (!CURRENCIES[currency]) return json({ ok: false, error: "Invalid currency." }, 400);
      if (!(amt > 0) || amt > 10000) return json({ ok: false, error: "Invalid amount." }, 400);
      const normPhone = normalizePhone(phone);
      if (!normPhone) return json({ ok: false, error: "Enter a valid Zimbabwe mobile (07… or +2637…)." }, 400);

      const ref = makeRef();
      // Customer pays the gross amount; the service fee is taken out of it and
      // only the remaining token value is vended.
      const feePct = parseFeePct(process.env.SERVICE_FEE_PCT);
      const tokenValue = tokenValueForGross(amt, feePct);
      const pay = await paynowInitiate({ ref, amount: amt, currency, email });
      await db.createRow(DB_ID, TABLE, ID.unique(), {
        ref, meter, amount: amt, currency, feePct, tokenValue,
        phone: normPhone, email: email || "", customerName: customerName || "",
        status: "pending", pollUrl: pay.pollUrl,
      });
      return json({ ok: true, ref, redirectUrl: pay.browserUrl });
    }

    /* ---- status poll + vend on payment ---- */
    if ((path === "/status" || path === "/result")) {
      const ref = req.query?.ref;
      if (!ref) return json({ ok: false, error: "Missing ref." }, 400);
      const rows = await db.listRows(DB_ID, TABLE, [Query.equal("ref", ref)]);
      if (rows.total === 0) return json({ ok: false, status: "not_found", error: "Transaction not found." }, 404);
      const tx = rows.rows[0];

      if (tx.status === "delivered") {
        return json({ ok: true, status: "delivered", token: tx.token, units: tx.units, meter: tx.meter });
      }
      if (tx.status === "vend_failed") {
        return json({ ok: true, status: "vend_failed", meter: tx.meter });
      }
      if (tx.status === "cancelled") {
        return json({ ok: true, status: "cancelled" });
      }

      // ZETDC-side pending vend: query, never re-vend.
      if (tx.status === "vend_pending" && tx.hrRef) {
        const qr = await hrQueryZesa(tx.hrRef);
        if (qr.ReplyCode === 2 || qr.ReplyCode === "2") {
          return finalizeVend(db, tx, qr, json, error);
        }
        return json({ ok: true, status: "processing" });
      }

      // Paid, but a previous vend attempt died mid-flight — retry (lock gates it).
      if (tx.status === "paid_vending") {
        return attemptVend(db, tx, json, log, error);
      }

      const pn = await paynowPoll(tx.pollUrl);
      const pnStatus = (pn.status || "").toLowerCase();
      log(`ref=${ref} paynow=${pnStatus}`);

      if (pnStatus === "paid" || pnStatus === "awaiting delivery") {
        return attemptVend(db, tx, json, log, error);
      }

      if (pnStatus === "cancelled" || pnStatus === "failed") {
        await db.updateRow(DB_ID, TABLE, tx.$id, { status: "cancelled" });
        return json({ ok: true, status: "cancelled" });
      }
      return json({ ok: true, status: "pending" });
    }

    return json({ ok: false, error: "Not found." }, 404);
  } catch (e) {
    error(String(e?.stack || e));
    return json({ ok: false, error: "Something went wrong. Please try again." }, 500);
  }
};

export default handler;
