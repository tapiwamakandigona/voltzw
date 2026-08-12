"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { unitsForAmount, fmt, RATE } from "@/lib/tariff";
import { tokenValueForGross } from "@/lib/fee";
import SemiAutoPay from "@/components/SemiAutoPay";
import { BoltIcon } from "@/components/icons";
import {
  amountError,
  isValidZimMobile,
  sanitizeAmountInput,
  saveLastOrderRef,
} from "@/components/buy-helpers";

import { API, canBuy, useHealth } from "@/components/payment-mode";

// The launch gate is resolved at runtime from the function's /health
// (see payment-mode.ts) — the build-time env var is only the first paint.

type Currency = "USD" | "ZWG";
type Step = "meter" | "amount" | "ecocash" | "redirecting" | "waitlisted";

type MeterInfo = { customerName: string; address: string };

type CheckMeterResp = {
  ok: boolean;
  found?: boolean; // newer function versions: 200 + found:false for unknown meters
  customerName?: string;
  address?: string;
  message?: string;
  error?: string;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  // A gateway error can return an HTML body — never surface a raw
  // SyntaxError to the customer, fall back to a friendly message.
  let data: (T & { error?: string }) | null = null;
  try {
    data = (await res.json()) as T & { error?: string };
  } catch {
    data = null;
  }
  if (!res.ok || data === null) {
    throw new Error(data?.error || "Something went wrong on our side. Please try again in a moment.");
  }
  return data;
}

/** Only follow redirect URLs that are plain https links — never trust the
 *  API blindly with javascript:/data: or other schemes. */
function safeRedirectUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

const PRESETS: Record<Currency, number[]> = {
  USD: [5, 10, 20, 50],
  ZWG: [100, 250, 500, 1000],
};

export default function BuyFlow() {
  const health = useHealth();
  const PAYMENT_MODE = health.mode;
  const feePct = health.feePct; // null = unknown (fee shown as included)
  const purchasable = canBuy(health);
  const [step, setStep] = useState<Step>("meter");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [meter, setMeter] = useState("");
  const [info, setInfo] = useState<MeterInfo | null>(null);

  const [currency, setCurrency] = useState<Currency>("USD");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const amt = parseFloat(amount) || 0;
  // Client-side mirror of the backend rules (max 10 000, positive number) so
  // the customer hears about problems inline instead of a dead submit button.
  const amtError = amountError(amount);
  const phoneInvalid = phone.length > 0 && !isValidZimMobile(phone);
  // Token value actually vended once the service fee is taken out (null = no breakdown shown).
  const tokenValue = useMemo(
    () => (feePct !== null && feePct > 0 && amt > 0 ? tokenValueForGross(amt, feePct) : null),
    [amt, feePct]
  );
  const estimate = useMemo(() => {
    if (amt <= 0) return null;
    const value = tokenValue ?? amt;
    if (currency === "ZWG") {
      const r = unitsForAmount(value, 0);
      return `≈ ${fmt(r.totalUnits, 1)} kWh (first purchase this month)`;
    }
    const r = unitsForAmount(value * RATE, 0);
    return `≈ ${fmt(r.totalUnits, 1)} kWh at ≈${fmt(RATE, 1)} ZWG/US$ (first purchase this month)`;
  }, [amt, currency, tokenValue]);

  const meterInputRef = useRef<HTMLInputElement>(null);

  /** Meter-not-found: keep focus in the input with its contents selected so
   *  the customer can retype the number immediately. */
  function refocusMeterInput() {
    const el = meterInputRef.current;
    if (el) {
      el.focus();
      el.select();
    }
  }

  async function checkMeter(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      // Raw fetch (not api()) — we need the status code to tell "meter not
      // found" apart from real failures across both response generations.
      const res = await fetch(`${API}/check-meter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meter: meter.trim() }),
      });
      let data: CheckMeterResp | null = null;
      try {
        data = (await res.json()) as CheckMeterResp;
      } catch { /* non-JSON gateway error page */ }

      if (res.ok && data?.ok && data.found !== false) {
        // CONTRACT-1 found shape (and the pre-`found` legacy success shape).
        setInfo({ customerName: (data.customerName || "").trim(), address: (data.address || "").trim() });
        setStep("amount");
        return;
      }

      // CONTRACT-1 not-found: new 200 {ok:true,found:false,message} — but stay
      // tolerant of the legacy 404 {ok:false,error} while the deployed
      // function lags behind the site.
      if ((res.ok && data?.ok === true && data.found === false) || res.status === 404) {
        setError(data?.message || data?.error || "Meter not found. Double-check the number.");
        refocusMeterInput();
        return;
      }

      throw new Error(data?.error || "Something went wrong on our side. Please try again in a moment.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify the meter.");
    } finally {
      setBusy(false);
    }
  }

  async function startPayment(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (PAYMENT_MODE === "semi_auto") {
      // SemiAutoPay creates the order and walks the customer through EcoCash.
      setStep("ecocash");
      return;
    }

    if (PAYMENT_MODE !== "paynow") {
      // Launch gate: capture interest (fire-and-forget) and show the coming-soon state.
      api("/waitlist", {
        method: "POST",
        body: JSON.stringify({
          meter: meter.trim(),
          phone: phone.trim(),
          email: email.trim(),
          currency,
          amount: amt,
        }),
      }).catch(() => { /* never block the UI on the waitlist */ });
      setStep("waitlisted");
      return;
    }

    setBusy(true);
    try {
      const r = await api<{ ref?: string; redirectUrl: string }>("/initiate", {
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
      const redirectUrl = safeRedirectUrl(r.redirectUrl);
      if (!redirectUrl) throw new Error("Could not start the payment. Please try again.");
      // CONTRACT-3: keep the ref recoverable in case the return trip to
      // /buy/status loses the ?ref= query string (trailing-slash redirect).
      if (r.ref) saveLastOrderRef(r.ref);
      setStep("redirecting");
      window.location.href = redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the payment.");
      setBusy(false);
    }
  }

  // coming_soon is NOT a dead end: meter verification is live, and the same
  // form doubles as the launch-list funnel — startPayment posts /waitlist and
  // shows the waitlisted state whenever the mode isn't a live one. The home
  // page promises "check your meter right now"; this keeps that promise.
  return (
    <div className="rounded-xl border border-line bg-card shadow-sm">
      {!health.loading && !purchasable && (
        <p className="rounded-t-xl border-b border-volt/40 bg-volt/10 px-4 py-2.5 text-center text-xs font-medium text-volt-deep">
          <BoltIcon className="mr-1 inline-block h-3.5 w-3.5 -translate-y-px align-middle" />
          Payments open very soon — verify your meter now and join the launch list; we&apos;ll text you the moment tokens go on sale.
        </p>
      )}
      {/* progress */}
      <div className="flex border-b border-line text-xs font-medium uppercase tracking-wider">
        {(["meter", "amount"] as const).map((s, i) => {
          const active = step === s || ((step === "redirecting" || step === "waitlisted" || step === "ecocash") && s === "amount");
          const done = s === "meter" && step !== "meter";
          return (
            <div
              key={s}
              className={`flex-1 px-4 py-3 transition-colors ${
                active ? "bg-volt/15 text-ink" : done ? "text-volt-deep" : "text-dim"
              }`}
            >
              <span aria-hidden className="mr-1.5 font-mono">{done ? "✓" : `${i + 1}.`}</span>
              {done && <span className="sr-only">Completed: </span>}
              <span className="whitespace-nowrap">{s === "meter" ? "Your meter" : "Amount & payment"}</span>
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
              ref={meterInputRef}
              inputMode="numeric"
              autoComplete="off"
              value={meter}
              onChange={(e) => setMeter(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 04123456789"
              maxLength={13}
              className="focus-quiet mt-2 w-full rounded-lg border border-line bg-paper px-4 py-3 font-mono text-lg tracking-wide outline-none transition focus:border-volt-deep focus:shadow-[0_0_0_4px_rgba(245,184,0,0.18)]"
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
              {busy ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Checking with ZETDC…
                </span>
              ) : (
                "Verify meter"
              )}
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
                    aria-pressed={currency === c}
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
                    className={`min-h-11 flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition ${
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
                onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
                placeholder={currency === "USD" ? "Custom amount, e.g. 15" : "Custom amount, e.g. 350"}
                aria-invalid={amtError ? true : undefined}
                aria-describedby={amtError ? "amount-error" : undefined}
                className={`focus-quiet mt-2 w-full rounded-lg border bg-paper px-4 py-3 font-mono text-lg outline-none transition ${
                  amtError
                    ? "border-danger-border focus:border-danger focus:shadow-[0_0_0_4px_rgba(180,35,24,0.15)]"
                    : "border-line focus:border-volt-deep focus:shadow-[0_0_0_4px_rgba(245,184,0,0.18)]"
                }`}
                required
              />
              {amtError && (
                <p id="amount-error" role="alert" className="mt-1.5 text-xs font-medium text-danger">
                  {amtError}
                </p>
              )}
              {!amtError && estimate && <p className="mt-1.5 text-xs text-volt-deep">{estimate}</p>}
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
                  aria-invalid={phoneInvalid ? true : undefined}
                  aria-describedby="phone-help"
                  className={`focus-quiet mt-2 w-full rounded-lg border bg-paper px-4 py-2.5 font-mono outline-none transition ${
                    phoneInvalid
                      ? "border-danger-border focus:border-danger focus:shadow-[0_0_0_4px_rgba(180,35,24,0.15)]"
                      : "border-line focus:border-volt-deep focus:shadow-[0_0_0_4px_rgba(245,184,0,0.18)]"
                  }`}
                  required
                />
                <p
                  id="phone-help"
                  role={phoneInvalid ? "alert" : undefined}
                  className={`mt-1.5 text-xs ${phoneInvalid ? "font-medium text-danger" : "text-dim"}`}
                >
                  {phoneInvalid
                    ? "Enter a valid Econet/NetOne number — 07XXXXXXXX or +2637XXXXXXXX"
                    : "Econet/NetOne number — 07XXXXXXXX or +2637XXXXXXXX"}
                </p>
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
                  className="focus-quiet mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 outline-none transition focus:border-volt-deep focus:shadow-[0_0_0_4px_rgba(245,184,0,0.18)]"
                />
              </div>
            </div>

            {tokenValue !== null ? (
              <p className="mt-5 rounded-lg border border-line bg-paper px-4 py-2.5 text-xs text-dim">
                You pay{" "}
                <span className="font-medium text-ink">
                  {currency === "USD" ? `$${amt.toFixed(2)}` : `ZWG ${amt.toFixed(2)}`}
                </span>{" "}
                — includes our service fee; electricity token value ≈{" "}
                <span className="font-medium text-ink">
                  {currency === "USD" ? `$${tokenValue.toFixed(2)}` : `ZWG ${tokenValue.toFixed(2)}`}
                </span>
                .
              </p>
            ) : feePct === null && amt > 0 ? (
              // /health failed, so the exact split is unknown — still
              // disclose the fee instead of hiding it. Deliberately no number
              // here: the rate lives in SERVICE_FEE_PCT and a hardcoded one
              // goes stale the moment it changes.
              <p className="mt-5 rounded-lg border border-line bg-paper px-4 py-2.5 text-xs text-dim">
                A service fee applies and is included in the amount you pay — the rest becomes your
                electricity token value. The exact split is shown before you pay.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy || amt <= 0 || amtError !== null || !isValidZimMobile(phone)}
              className="mt-6 w-full rounded-lg bg-volt px-5 py-3.5 font-display font-bold text-ink transition hover:bg-volt/80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy
                ? "Preparing secure checkout…"
                : PAYMENT_MODE === "semi_auto"
                  ? `Pay ${currency === "USD" ? "$" : "ZWG "}${amount || "—"} with EcoCash`
                  : purchasable
                    ? `Pay ${currency === "USD" ? "$" : "ZWG "}${amount || "—"} with Paynow`
                    : "Join the launch list"}
            </button>
            {!purchasable && PAYMENT_MODE !== "semi_auto" ? (
              <p className="mt-3 text-center text-xs text-dim">
                No payment is taken today — we save your meter and amount, and text you the moment
                token purchases open so you can finish in one tap.
              </p>
            ) : PAYMENT_MODE === "semi_auto" ? (
              <p className="mt-3 text-center text-xs text-dim">
                Pay by EcoCash from your phone — we&apos;ll show you exactly how on the next step,
                and your token is generated automatically once your payment lands.
              </p>
            ) : (
              <p className="mt-3 text-center text-xs text-dim">
                Secure payment via Paynow — EcoCash, Zimswitch, InnBucks, bank &amp; more.
                Payment fees are shown at checkout before you confirm.
              </p>
            )}
          </form>
        )}

        {step === "ecocash" && (
          <SemiAutoPay
            meter={meter.trim()}
            phone={phone.trim()}
            email={email.trim()}
            currency={currency}
            amount={amt}
            onBack={() => setStep("amount")}
          />
        )}

        {step === "waitlisted" && (
          <div className="animate-rise py-6 text-center sm:py-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-volt/40 bg-volt/15 text-volt-deep">
              <BoltIcon className="h-6 w-6" />
            </div>
            <span className="mt-4 inline-block rounded-full border border-line bg-paper px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-volt-deep">
              Coming soon
            </span>
            <p className="mt-3 font-display text-xl font-bold">
              Almost there — token purchases launch very soon
            </p>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-dim">
              Your meter checks out{info?.customerName ? <> — registered to <span className="font-medium text-ink">{info.customerName}</span></> : null}.
              Meter verification is already live; we&apos;re just finishing the final payment plumbing.
            </p>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed">
              We&apos;ll {email.trim() ? "SMS and email" : "SMS"} you at{" "}
              <span className="font-mono font-medium">{phone}</span> the moment it launches, so you can be first in line.
            </p>
            <p className="mt-5 text-xs text-dim">
              Meanwhile, plan your purchase with the{" "}
              <Link href="/" className="font-medium text-volt-deep underline">free calculator</Link>.
            </p>
          </div>
        )}

        {step === "redirecting" && (
          <div className="animate-rise py-8 text-center">
            <p className="font-display text-lg font-semibold">Taking you to Paynow…</p>
            <p className="mt-2 text-sm text-dim">Complete the payment there and we&apos;ll bring you straight back to your token.</p>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
