import { Client, TablesDB, ID, Query } from "node-appwrite";
import crypto from "node:crypto";

/* ---------------- Config ---------------- */

const HR_BASE = "https://ssl.hot.co.zw/api/v1/";
const PAYNOW_INITIATE = "https://www.paynow.co.zw/interface/initiatetransaction";
const DB_ID = "voltdb";
const TABLE = "transactions";
const SITE = process.env.SITE_URL || "https://zesa.tapiwa.me";

const CURRENCIES = {
  USD: { id: process.env.PAYNOW_ID_USD, key: process.env.PAYNOW_KEY_USD },
  ZWG: { id: process.env.PAYNOW_ID_ZWG, key: process.env.PAYNOW_KEY_ZWG },
};

function isConfigured() {
  return Boolean(
    process.env.HR_ACCESS_CODE &&
    process.env.HR_ACCESS_PASSWORD &&
    CURRENCIES.USD.id && CURRENCIES.USD.key &&
    CURRENCIES.ZWG.id && CURRENCIES.ZWG.key
  );
}

/* ---------------- Hot Recharge ---------------- */

function hrHeaders() {
  return {
    "Content-Type": "application/json",
    "x-access-code": process.env.HR_ACCESS_CODE,
    "x-access-password": process.env.HR_ACCESS_PASSWORD,
    "x-agent-reference": crypto.randomUUID().replaceAll("-", "").slice(0, 24),
  };
}

async function hrPost(path, body) {
  const res = await fetch(HR_BASE + path, {
    method: "POST",
    headers: hrHeaders(),
    body: JSON.stringify(body),
  });
  return res.json();
}

async function hrCheckMeter(meter) {
  return hrPost("agents/check-customer-zesa", { MeterNumber: meter });
}

async function hrVend(amount, meter, notifyPhone) {
  return hrPost("agents/recharge-zesa", {
    Amount: amount,
    meterNumber: meter,
    TargetNumber: notifyPhone,
  });
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
  const res = await fetch(pollUrl, { method: "POST" });
  return parseUrlEncoded(await res.text());
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
      return json({ ok: true, configured: isConfigured() });
    }

    /* ---- meter lookup ---- */
    if (path === "/check-meter" && req.method === "POST") {
      const { meter } = req.bodyJson || {};
      if (!/^\d{9,13}$/.test(meter || "")) {
        return json({ ok: false, error: "Enter a valid meter number (11 digits)." }, 400);
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
      if (!/^07\d{8}$/.test(phone || "")) return json({ ok: false, error: "Enter a valid Zimbabwe mobile (07…)." }, 400);

      const ref = "VZ" + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString("hex").toUpperCase();
      const pay = await paynowInitiate({ ref, amount: amt, currency, email });
      await db.createRow(DB_ID, TABLE, ID.unique(), {
        ref, meter, amount: amt, currency,
        phone, email: email || "", customerName: customerName || "",
        status: "pending", pollUrl: pay.pollUrl,
      });
      return json({ ok: true, ref, redirectUrl: pay.browserUrl });
    }

    /* ---- status poll + vend on payment ---- */
    if ((path === "/status" || path === "/result")) {
      const ref = req.query?.ref;
      if (!ref) return json({ ok: false, error: "Missing ref." }, 400);
      const rows = await db.listRows(DB_ID, TABLE, [Query.equal("ref", ref)]);
      if (rows.total === 0) return json({ ok: false, error: "Transaction not found." }, 404);
      const tx = rows.rows[0];

      if (tx.status === "delivered") {
        return json({ ok: true, status: "delivered", token: tx.token, units: tx.units, meter: tx.meter });
      }
      if (tx.status === "vend_failed") {
        return json({ ok: true, status: "vend_failed", meter: tx.meter });
      }

      const pn = await paynowPoll(tx.pollUrl);
      const pnStatus = (pn.status || "").toLowerCase();
      log(`ref=${ref} paynow=${pnStatus}`);

      if (pnStatus === "paid" || pnStatus === "awaiting delivery") {
        // guard against double-vend
        if (tx.status !== "paid_vending") {
          await db.updateRow(DB_ID, TABLE, tx.$id, { status: "paid_vending" });
          const vendAmount = tx.currency === "USD" ? tx.amount : tx.amount;
          const vr = await hrVend(vendAmount, tx.meter, tx.phone);
          if (vr.ReplyCode === 2 || vr.ReplyCode === "2") {
            const t = vr.Tokens?.[0] || {};
            await db.updateRow(DB_ID, TABLE, tx.$id, {
              status: "delivered",
              token: String(t.Token || ""),
              units: Number(t.Units || 0),
              hrRef: String(vr.AgentReference || ""),
            });
            return json({ ok: true, status: "delivered", token: String(t.Token || ""), units: Number(t.Units || 0), meter: tx.meter });
          }
          await db.updateRow(DB_ID, TABLE, tx.$id, {
            status: "vend_failed",
            lastError: String(vr.ReplyMsg || "vend error").slice(0, 1000),
          });
          error(`vend failed ref=${ref}: ${vr.ReplyMsg}`);
          return json({ ok: true, status: "vend_failed", meter: tx.meter });
        }
        return json({ ok: true, status: "processing" });
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
