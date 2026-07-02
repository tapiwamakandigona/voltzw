"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { unitsForAmount, fmt, RATE } from "@/lib/tariff";

const API = "https://voltzw-vend.appwrite.network";

type Currency = "USD" | "ZWG";
type Step = "meter" | "amount" | "redirecting";

type MeterInfo = { customerName: string; address: string };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data?.error || "Something went wrong. Please try again.");
  return data;
}

const PRESETS: Record<Currency, number[]> = {
  USD: [5, 10, 20, 50],
  ZWG: [100, 250, 500, 1000],
};

export default function BuyFlow() {
  const [live, setLive] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>("meter");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [meter, setMeter] = useState("");
  const [info, setInfo] = useState<MeterInfo | null>(null);

  const [currency, setCurrency] = useState<Currency>("USD");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    api<{ configured: boolean }>("/health")
      .then((h) => setLive(h.configured))
      .catch(() => setLive(false));
  }, []);

  const amt = parseFloat(amount) || 0;
  const estimate = useMemo(() => {
    if (amt <= 0) return null;
    if (currency === "ZWG") {
      const r = unitsForAmount(amt, 0);
      return `≈ ${fmt(r.totalUnits, 1)} kWh (first purchase this month)`;
    }
    const r = unitsForAmount(amt * RATE, 0);
    return `≈ ${fmt(r.totalUnits, 1)} kWh at ≈${fmt(RATE, 1)} ZWG/US$ (first purchase this month)`;
  }, [amt, currency]);

  async function checkMeter(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await api<MeterInfo>("/check-meter", {
        method: "POST",
        body: JSON.stringify({ meter: meter.trim() }),
      });
      setInfo(r);
      setStep("amount");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify the meter.");
    } finally {
      setBusy(false);
    }
  }

  async function startPayment(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await api<{ redirectUrl: string }>("/initiate", {
        method: "POST",
        body: JSON.stringify({
          meter: meter.trim(),
          amount: amt,
          currency,
          phone: phone.trim(),
          email: email.trim(),
          customerName: info?.customerName || "",
        }),
      });
      setStep("redirecting");
      window.location.href = r.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the payment.");
      setBusy(false);
    }
  }

  if (live === false) {
    return (
      <div className="rounded-xl border border-line bg-card p-8 text-center">
        <p className="font-display text-xl font-bold">Token purchases are almost here ⚡</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-dim">
          We&apos;re finishing the plumbing with our payment partners. Very soon you&apos;ll buy
          ZESA tokens right here with EcoCash, Zimswitch or your bank — in USD or ZWG.
        </p>
        <p className="mt-4 text-sm">
          Meanwhile, try the{" "}
          <Link href="/" className="font-medium text-volt-deep underline">free calculator</Link>{" "}
          to plan your purchase.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-card shadow-sm">
      {/* progress */}
      <div className="flex border-b border-line text-xs font-medium uppercase tracking-wider">
        {(["meter", "amount"] as const).map((s, i) => {
          const active = step === s || (step === "redirecting" && s === "amount");
          const done = s === "meter" && step !== "meter";
          return (
            <div
              key={s}
              className={`flex-1 px-4 py-3 transition-colors ${
                active ? "bg-volt/15 text-ink" : done ? "text-volt-deep" : "text-dim"
              }`}
            >
              <span className="mr-1.5 font-mono">{done ? "✓" : i + 1}.</span>
              {s === "meter" ? "Your meter" : "Amount & payment"}
            </div>
          );
        })}
      </div>

      <div className="p-6 sm:p-8">
        {step === "meter" && (
          <form onSubmit={checkMeter} className="animate-rise">
            <label htmlFor="meter" className="block text-sm font-medium">
              Prepaid meter number
            </label>
            <input
              id="meter"
              inputMode="numeric"
              autoComplete="off"
              value={meter}
              onChange={(e) => setMeter(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 04123456789"
              maxLength={13}
              className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-3 font-mono text-lg tracking-wide outline-none transition focus:border-volt focus:ring-2 focus:ring-volt/30"
              required
            />
            <p className="mt-2 text-xs text-dim">
              The meter number printed on your meter or an old token receipt (usually 11 digits). We&apos;ll confirm the
              registered name before you pay.
            </p>
            <button
              type="submit"
              disabled={busy || meter.length < 9}
              className="mt-5 w-full rounded-lg bg-ink px-5 py-3 font-display font-semibold text-white transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Checking with ZETDC…" : "Verify meter"}
            </button>
          </form>
        )}

        {step === "amount" && info && (
          <form onSubmit={startPayment} className="animate-rise">
            <div className="rounded-lg border border-volt/40 bg-volt/10 px-4 py-3 text-sm">
              <p className="font-semibold">{info.customerName || "Meter verified"}</p>
              {info.address && <p className="mt-0.5 text-dim">{info.address}</p>}
              <p className="mt-1 font-mono text-xs text-dim">Meter {meter}</p>
              <button
                type="button"
                onClick={() => { setStep("meter"); setInfo(null); }}
                className="mt-1 text-xs font-medium text-volt-deep underline"
              >
                Change meter
              </button>
            </div>

            <div className="mt-6">
              <span className="block text-sm font-medium">Currency</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["USD", "ZWG"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setCurrency(c); setAmount(""); }}
                    className={`rounded-lg border px-4 py-2.5 font-display font-semibold transition ${
                      currency === c
                        ? "border-ink bg-ink text-white"
                        : "border-line bg-paper hover:border-ink/40"
                    }`}
                  >
                    {c === "USD" ? "US Dollars" : "ZWG (ZiG)"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="amount" className="block text-sm font-medium">
                Amount ({currency})
              </label>
              <div className="mt-2 flex gap-2">
                {PRESETS[currency].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(String(p))}
                    className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition ${
                      amt === p ? "border-volt bg-volt/15" : "border-line bg-paper hover:border-volt/60"
                    }`}
                  >
                    {currency === "USD" ? `$${p}` : p}
                  </button>
                ))}
              </div>
              <input
                id="amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder={currency === "USD" ? "Custom amount, e.g. 15" : "Custom amount, e.g. 350"}
                className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-3 font-mono text-lg outline-none transition focus:border-volt focus:ring-2 focus:ring-volt/30"
                required
              />
              {estimate && <p className="mt-1.5 text-xs text-volt-deep">{estimate}</p>}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium">
                  Mobile number <span className="text-dim">(token SMS)</span>
                </label>
                <input
                  id="phone"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ""))}
                  placeholder="07… or +2637…"
                  maxLength={13}
                  className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 font-mono outline-none transition focus:border-volt focus:ring-2 focus:ring-volt/30"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium">
                  Email <span className="text-dim">(optional receipt)</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 outline-none transition focus:border-volt focus:ring-2 focus:ring-volt/30"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy || amt <= 0 || phone.length !== 10}
              className="mt-6 w-full rounded-lg bg-volt px-5 py-3.5 font-display font-bold text-ink transition hover:bg-volt-deep hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Preparing secure checkout…" : `Pay ${currency === "USD" ? "$" : "ZWG "}${amount || "—"} with Paynow`}
            </button>
            <p className="mt-3 text-center text-xs text-dim">
              Secure payment via Paynow — EcoCash, Zimswitch, InnBucks, bank &amp; more.
              Payment fees are shown at checkout before you confirm.
            </p>
          </form>
        )}

        {step === "redirecting" && (
          <div className="animate-rise py-8 text-center">
            <p className="font-display text-lg font-semibold">Taking you to Paynow…</p>
            <p className="mt-2 text-sm text-dim">Complete the payment there and we&apos;ll bring you straight back to your token.</p>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
