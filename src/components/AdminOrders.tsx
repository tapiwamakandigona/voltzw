"use client";

import { useCallback, useEffect, useState } from "react";

const API = "https://voltzw-vend.appwrite.network";
const KEY_STORAGE = "voltzw_admin_key";

type Order = {
  id: string;
  ref: string;
  createdAt: string;
  status: string;
  meter: string;
  phone: string;
  email: string;
  currency: string;
  amountRequested: number;
  amountDue: number;
  tokenValue: number;
  expiresAt: string;
  token: string;
  units: number;
  note: string;
};

type OrdersResp = {
  ok: boolean;
  orders: Order[];
  counts: Record<string, number>;
  error?: string;
};

// Display order: money-at-risk first.
const STATUS_ORDER = ["needs_attention", "vending", "pending_payment", "complete", "expired"];

const STATUS_LABEL: Record<string, string> = {
  needs_attention: "Needs attention",
  vending: "Vending",
  pending_payment: "Waiting for payment",
  complete: "Complete",
  expired: "Expired",
};

const STATUS_STYLE: Record<string, string> = {
  needs_attention: "border-red-300 bg-red-50 text-red-700",
  vending: "border-volt/40 bg-volt/15 text-volt-deep",
  pending_payment: "border-line bg-paper text-dim",
  complete: "border-volt/40 bg-volt/10 text-ink",
  expired: "border-line bg-paper text-dim",
};

function fmtWhen(iso: string) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AdminOrders() {
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [data, setData] = useState<OrdersResp | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (adminKey: string) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API}/admin/orders`, { headers: { "x-admin-key": adminKey } });
      if (res.status === 404) throw new Error("Wrong admin key.");
      const d = (await res.json()) as OrdersResp;
      if (!d.ok) throw new Error(d.error || "Could not load orders.");
      setData(d);
      localStorage.setItem(KEY_STORAGE, adminKey);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load orders.");
      setData(null);
    } finally {
      setBusy(false);
    }
  }, []);

  // Restore the saved key after mount (deferred: localStorage is browser-only
  // and the page is statically prerendered — same pattern as TokenStatus).
  useEffect(() => {
    const t = setTimeout(() => {
      const k = localStorage.getItem(KEY_STORAGE) || "";
      if (k) { setKey(k); setSaved(true); load(k); }
    }, 0);
    return () => clearTimeout(t);
  }, [load]);

  const grouped = (data?.orders || []).reduce<Record<string, Order[]>>((acc, o) => {
    (acc[o.status] ||= []).push(o);
    return acc;
  }, {});

  return (
    <div>
      <form
        onSubmit={(e) => { e.preventDefault(); load(key.trim()); }}
        className="flex gap-2"
      >
        <input
          type="password"
          value={key}
          onChange={(e) => { setKey(e.target.value); setSaved(false); }}
          placeholder="Admin key"
          autoComplete="off"
          className="w-full rounded-lg border border-line bg-paper px-4 py-2.5 font-mono text-sm outline-none transition focus:border-volt focus:ring-2 focus:ring-volt/30"
        />
        <button
          type="submit"
          disabled={busy || !key.trim()}
          className="shrink-0 rounded-lg bg-ink px-5 py-2.5 font-display text-sm font-semibold text-white transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Loading…" : saved && data ? "Refresh" : "Load orders"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {data && (
        <>
          {/* counts */}
          <div className="mt-5 flex flex-wrap gap-2">
            {STATUS_ORDER.map((s) => (
              <span key={s} className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLE[s]}`}>
                {STATUS_LABEL[s]}: {data.counts?.[s] ?? 0}
              </span>
            ))}
          </div>

          {/* groups */}
          {STATUS_ORDER.filter((s) => grouped[s]?.length).map((s) => (
            <section key={s} className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-dim">{STATUS_LABEL[s]}</h2>
              <div className="mt-2 space-y-2">
                {grouped[s].map((o) => (
                  <article
                    key={o.id}
                    className={`rounded-lg border px-4 py-3 text-sm ${
                      s === "needs_attention" ? "border-red-300 bg-red-50" : "border-line bg-card"
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="font-mono text-xs font-semibold">{o.ref}</span>
                      <span className="font-display font-bold">
                        {o.currency === "USD" ? "$" : "ZWG "}{Number(o.amountDue).toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-dim">
                      {fmtWhen(o.createdAt)} · meter <span className="font-mono">{o.meter}</span> ·{" "}
                      <span className="font-mono">{o.phone}</span>
                      {o.email ? <> · {o.email}</> : null}
                    </p>
                    {o.token && (
                      <p className="mt-1.5 select-all font-mono text-xs">
                        token {o.token}{o.units ? ` · ${Number(o.units).toFixed(1)} kWh` : ""}
                      </p>
                    )}
                    {o.note && (
                      <p className="mt-1.5 rounded bg-white/60 px-2 py-1 font-mono text-xs text-red-700">{o.note}</p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}

          {data.orders.length === 0 && (
            <p className="mt-6 rounded-lg border border-line bg-card px-4 py-6 text-center text-sm text-dim">
              No orders yet. They&apos;ll appear here as customers start paying.
            </p>
          )}
        </>
      )}
    </div>
  );
}
