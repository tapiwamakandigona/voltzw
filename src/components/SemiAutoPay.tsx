"use client";

import { useEffect, useRef, useState } from "react";
import { BoltIcon } from "@/components/icons";
import { saveLastOrderRef } from "@/components/buy-helpers";

const API = "https://voltzw-vend.appwrite.network";

type OrderResp = {
  ok: boolean;
  orderId: string;
  amountDue: number;
  currency: "USD" | "ZWG";
  expiresAt: string;
  instructions: string[];
  error?: string;
};

type OrderStatusResp = {
  ok: boolean;
  status?: "pending_payment" | "vending" | "complete" | "needs_attention" | "expired" | "not_found";
  token?: string;
  units?: number;
  meter?: string;
  error?: string;
};

type Props = {
  meter: string;
  phone: string;
  email: string;
  currency: "USD" | "ZWG";
  amount: number;
  onBack: () => void;
};

/* Module-level in-flight guard: React StrictMode mounts effects twice in
 * dev, and the cleanup ref only suppressed the state update — the second
 * POST still created a duplicate order and burned a unique-cents offset.
 * Identical concurrent requests now share one promise; failures are
 * cleared immediately so a retry can issue a fresh request. */
const inflightOrders = new Map<string, Promise<OrderResp>>();

function createOrder(body: { meter: string; phone: string; email: string; currency: string; amount: number }): Promise<OrderResp> {
  const key = JSON.stringify(body);
  const existing = inflightOrders.get(key);
  if (existing) return existing;
  const p = (async () => {
    const res = await fetch(`${API}/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let data: OrderResp | null = null;
    try {
      data = (await res.json()) as OrderResp;
    } catch { /* non-JSON body (e.g. gateway error page) */ }
    if (!res.ok || !data?.ok) throw new Error(data?.error || "Could not create your order. Please try again.");
    return data;
  })();
  inflightOrders.set(key, p);
  p.then(
    // Keep a fulfilled promise around briefly so StrictMode's second
    // effect run reuses the same order, then let it expire.
    () => setTimeout(() => inflightOrders.delete(key), 10_000),
    // Drop failures immediately so a retry issues a fresh request.
    () => inflightOrders.delete(key)
  );
  return p;
}

function formatToken(t: string) {
  const digits = t.replace(/\D/g, "");
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim() || t;
}


/** Split "11.03" into whole + cents so the cents — the part that matches the
 *  payment to the meter — can carry visual weight of their own. */
function splitAmount(n: number): { whole: string; cents: string } {
  const [whole, cents] = n.toFixed(2).split(".");
  return { whole, cents };
}

function useCountdown(expiresAt: string | undefined) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setLeft(Math.max(0, Date.parse(expiresAt) - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (left === null) return null;
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function SemiAutoPay({ meter, phone, email, currency, amount, onBack }: Props) {
  const [order, setOrder] = useState<OrderResp | null>(null);
  const [status, setStatus] = useState<OrderStatusResp | null>(null);
  const [error, setError] = useState("");
  const [lost, setLost] = useState(false); // poll cap reached or order unknown
  const [copied, setCopied] = useState(false);
  const stopped = useRef(false);

  // Create the order once (idempotent via the module-level in-flight guard,
  // so StrictMode's double effect run can't create two orders).
  useEffect(() => {
    stopped.current = false;
    createOrder({ meter, phone, email, currency, amount })
      .then((data) => {
        // CONTRACT-3: persist the ref at order creation so /buy/status can
        // recover it even if a later link/redirect drops the query string.
        saveLastOrderRef(data.orderId);
        if (!stopped.current) setOrder(data);
      })
      .catch((e) => {
        if (!stopped.current) setError(e instanceof Error ? e.message : "Could not create your order.");
      });
    return () => { stopped.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll the order status every 5s until it settles (capped at ~5 minutes,
  // same as TokenStatus — the countdown/SMS covers anything slower).
  useEffect(() => {
    if (!order) return;
    let stop = false;
    let tries = 0;
    async function poll() {
      if (stop) return;
      tries += 1;
      try {
        const res = await fetch(`${API}/order-status?id=${encodeURIComponent(order!.orderId)}`);
        const data = (await res.json()) as OrderStatusResp;
        if (stop) return;
        // The backend can't find this order: /order-status returns
        // { ok:false, status:"not_found" } on 404 (older shapes had no status).
        if (data.ok === false && (data.status === "not_found" || !data.status)) { setLost(true); return; }
        setStatus(data);
        if (data.status === "complete" || data.status === "needs_attention" || data.status === "expired") return;
      } catch { /* transient — retry */ }
      if (tries < 60) setTimeout(poll, 5000);
      else setLost(true);
    }
    poll();
    return () => { stop = true; };
  }, [order]);

  const countdown = useCountdown(order?.expiresAt);

  async function copyToken() {
    if (!status?.token) return;
    try {
      await navigator.clipboard.writeText(status.token.replace(/\D/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  if (error) {
    return (
      <div role="alert" className="animate-rise py-6 text-center">
        <p className="font-display text-lg font-semibold">Could not start your order</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-dim">{error}</p>
        <button onClick={onBack} className="mt-5 rounded-lg bg-ink px-6 py-2.5 font-display font-semibold text-white transition hover:bg-ink/85">
          Back
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="animate-rise py-8 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-line border-t-volt" />
        <p className="mt-4 font-display text-lg font-semibold">Reserving your order…</p>
      </div>
    );
  }

  /* ---- settled states ---- */

  if (lost) {
    const supportHref = `mailto:silentics.org@gmail.com?subject=${encodeURIComponent(
      `VoltZW order ${order.orderId}`
    )}&body=${encodeURIComponent(`Hi, I need help with my order. Reference: ${order.orderId}`)}`;
    return (
      <div className="animate-rise py-6 text-center">
        <p className="font-display text-lg font-semibold">This is taking longer than usual</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-dim">
          If you paid, your token will still arrive by SMS — your money is safe. Keep your order
          reference <span className="font-mono font-medium text-ink">{order.orderId}</span>, or{" "}
          <a href={supportHref} className="text-volt-deep underline">contact support with this reference</a>{" "}
          and we&apos;ll sort it out.
        </p>
        <button onClick={() => window.location.reload()} className="mt-5 rounded-lg bg-ink px-6 py-2.5 font-display font-semibold text-white transition hover:bg-ink/85">
          Refresh now
        </button>
      </div>
    );
  }

  if (status?.status === "complete" && status.token) {
    return (
      <div aria-live="polite" className="animate-rise py-2 text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-volt-deep">
          Token delivered
          <BoltIcon className="ml-1 inline-block h-4 w-4 -translate-y-px align-middle" />
        </p>
        <p className="mt-4 select-all break-all font-mono text-2xl font-bold tracking-wider sm:text-3xl">
          {formatToken(status.token)}
        </p>
        {typeof status.units === "number" && status.units > 0 && (
          <p className="mt-3 text-sm text-dim">
            {status.units.toFixed(1)} kWh for meter <span className="font-mono">{meter}</span>
          </p>
        )}
        <button
          onClick={copyToken}
          className="mt-6 rounded-lg bg-ink px-6 py-2.5 font-display font-semibold text-white transition hover:bg-ink/85"
        >
          {copied ? "Copied ✓" : "Copy token"}
        </button>
        <p className="mt-4 text-xs text-dim">
          We also sent it by SMS. Enter the 20 digits on your meter keypad.
        </p>
      </div>
    );
  }

  if (status?.status === "needs_attention") {
    return (
      <div className="animate-rise py-6 text-center">
        <p className="font-display text-lg font-semibold">We received something unusual — we&apos;re on it</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-dim">
          Your payment reached us but didn&apos;t match automatically. A human is checking it now —
          you&apos;ll get your token shortly, usually by SMS to <span className="font-mono">{phone}</span>.
          Your money is safe. Keep your order reference:
        </p>
        <p className="mt-3 font-mono text-sm font-semibold">{order.orderId}</p>
      </div>
    );
  }

  if (status?.status === "expired") {
    return (
      <div className="animate-rise py-6 text-center">
        <p className="font-display text-lg font-semibold">Order expired</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-dim">
          We didn&apos;t see a payment for this order in time, so its amount was released.
          If you did pay, contact us with reference <span className="font-mono">{order.orderId}</span> —
          otherwise just start again.
        </p>
        <button onClick={onBack} className="mt-5 rounded-lg bg-ink px-6 py-2.5 font-display font-semibold text-white transition hover:bg-ink/85">
          Start again
        </button>
      </div>
    );
  }

  /* ---- waiting for payment / vending ---- */

  const { whole, cents } = splitAmount(order.amountDue);
  const vending = status?.status === "vending";

  return (
    <div className="animate-rise">
      {/* Exact amount — the cents are the matching key, so they get equal billing */}
      <div className="rounded-lg border border-volt/40 bg-volt/10 px-4 py-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-volt-deep">
          Pay exactly
        </p>
        <p className="mt-1 font-display font-bold leading-none">
          <span className="text-4xl sm:text-5xl">{currency === "USD" ? "$" : "ZWG "}{whole}</span>
          <span className="text-4xl text-volt-deep sm:text-5xl">.{cents}</span>
        </p>
        <p className="mt-2 text-xs leading-relaxed text-dim">
          Pay this exact amount — <span className="font-medium text-ink">including the {currency === "USD" ? `${cents} cents` : `.${cents}`}</span> —
          so we can match your payment to meter <span className="font-mono">{meter}</span>.
          The matching cents aren&apos;t extra: they&apos;re credited to your token value.
        </p>
      </div>

      {/* Payment steps */}
      <ol className="mt-5 space-y-2.5">
        {order.instructions.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line bg-paper font-mono text-[11px] font-semibold text-volt-deep">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      {/* Live status */}
      <div className="mt-6 flex items-center gap-3 rounded-lg border border-line bg-paper px-4 py-3">
        <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-volt" />
        <p className="text-sm text-dim">
          {vending
            ? "Payment received — generating your token…"
            : "Watching for your payment. This page updates automatically."}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-dim">
        <span>
          Order <span className="font-mono font-medium text-ink">{order.orderId}</span>
        </span>
        {countdown && (
          <span>
            Amount reserved for <span className="font-mono font-medium text-ink">{countdown}</span>
          </span>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-dim">
        Paid a different amount by mistake? Don&apos;t pay again — <a href="mailto:silentics.org@gmail.com" className="text-volt-deep underline">contact us</a> with
        your order reference and we&apos;ll sort it out.
      </p>
    </div>
  );
}
