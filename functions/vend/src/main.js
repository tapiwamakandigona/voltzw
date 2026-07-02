import { Client, TablesDB, ID, Query } from "node-appwrite";
import crypto from "node:crypto";

/* ---------------- Config ---------------- */

const HR_BASE = "https://ssl.hot.co.zw/api/v1/";
const PAYNOW_INITIATE = "https://www.paynow.co.zw/interface/initiatetransaction";
const DB_ID = "voltdb";
const TABLE = "transactions";
const LOCKS = "vend_locks";
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

/* ---------------- Handler ---------------- */

export default async ({ req, res, log, error }) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (req.method === "OPTIONS") return res.text("", 204, cors);

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers["x-appwrite-key"] || "");
  const db = new TablesDB(client);

  const path = (req.path || "/").replace(/\/+$/, "") || "/";
  const json = (obj, code = 200) => res.json(obj, code, cors);

  try {
    /* ---- health / config check ---- */
    if (path === "/health") {
      return json({ ok: true, configured: isConfigured(), feePct: parseFeePct(process.env.SERVICE_FEE_PCT) });
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
