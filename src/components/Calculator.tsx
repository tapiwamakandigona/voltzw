"use client";

import { useMemo, useState } from "react";
import { WhatsAppIcon } from "@/components/icons";
import {
  BANDS, bandColor, costForUnits, unitsForAmount, remainingQuota, zwgToUsd, usdToZwg, fmt,
  MONTHLY_QUOTA, RATE, type BandSlice,
} from "@/lib/tariff";
import { BulbIcon } from "@/components/icons";

type Mode = "money" | "units";
type Currency = "ZWG" | "USD";

const MAX = 1_000_000_000; // matches MAX_INPUT in lib/tariff

// The amounts people actually buy (mirrors the "common amounts" section and the GSC queries).
const QUICK_ZWG = [100, 200, 500, 1000, 2000];
const QUICK_USD = [1, 2, 5, 10, 20];
const QUICK_UNITS = [50, 100, 200, 300, 400];

/** Validate the primary calculator input. Returns the parsed value or a
 *  human error — never lets NaN/Infinity/negatives reach the band math. */
function parseInput(raw: string, what: string): { value: number; error: string | null } {
  if (raw.trim() === "") return { value: 0, error: `Enter ${what} to calculate.` };
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return { value: 0, error: "Enter a valid number." };
  if (n <= 0) return { value: 0, error: `Enter ${what} greater than 0.` };
  if (n > MAX) return { value: 0, error: "That's more than we can price — try a smaller number." };
  return { value: n, error: null };
}

function SliceTable({ slices, currency }: { slices: BandSlice[]; currency: Currency }) {
  if (slices.length === 0) return null;
  return (
    <div className="scroll-hint mt-4 rounded-lg border border-line bg-card">
      <div tabIndex={0} role="region" aria-label="Band-by-band breakdown (scrolls sideways)" className="overflow-x-auto rounded-lg">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-dim">
              <th className="px-2 py-2 font-medium sm:px-3">Band</th>
              <th className="px-2 py-2 text-right font-medium sm:px-3">Units</th>
              <th className="px-2 py-2 text-right font-medium sm:px-3">Cost</th>
              <th className="hidden px-2 py-2 text-right font-medium sm:table-cell sm:px-3">{currency === "ZWG" ? "ZWG/unit" : "US$/unit"}</th>
            </tr>
          </thead>
          <tbody>
            {slices.map((s, i) => (
              <tr key={i} className="border-b border-line last:border-0">
                <td className="px-2 py-2 whitespace-nowrap sm:px-3">
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: bandColor(BANDS.findIndex((b) => b.label === s.band.label)) }} />
                    {s.band.label}
                  </span>
                </td>
                <td className="px-2 py-2 text-right font-mono sm:px-3">{fmt(s.units, 1)}</td>
                <td className="px-2 py-2 text-right font-mono whitespace-nowrap sm:px-3">
                  {currency === "ZWG" ? `ZiG ${fmt(s.costZwg)}` : `US$${fmt(zwgToUsd(s.costZwg))}`}
                </td>
                <td className="hidden px-2 py-2 text-right font-mono whitespace-nowrap sm:table-cell sm:px-3">
                  {currency === "ZWG" ? fmt(s.band.inclLevyZwg, 4) : fmt(zwgToUsd(s.band.inclLevyZwg), 4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Calculator() {
  const [mode, setMode] = useState<Mode>("money");
  const [currency, setCurrency] = useState<Currency>("ZWG");
  const [amount, setAmount] = useState<string>("500");
  const [units, setUnits] = useState<string>("100");
  const [already, setAlready] = useState<string>("0");

  const alreadyN = Math.max(0, parseFloat(already) || 0);

  function switchCurrency(c: Currency) {
    if (c === currency) return;
    const amt = parseFloat(amount) || 0;
    // convert the typed amount so the result stays the same
    setAmount(String(Math.round((c === "USD" ? zwgToUsd(amt) : usdToZwg(amt)) * 100) / 100));
    setCurrency(c);
  }

  const result = useMemo(() => {
    if (mode === "money") {
      const { value: raw, error } = parseInput(amount, "an amount");
      if (error) return { error, slices: [] as BandSlice[] };
      const amtZwg = currency === "USD" ? usdToZwg(raw) : raw;
      const r = unitsForAmount(amtZwg, alreadyN);
      const sub =
        currency === "USD"
          ? `for US$${fmt(raw)} (≈ ZiG ${fmt(amtZwg)})`
          : `for ZiG ${fmt(raw)} (≈ US$${fmt(zwgToUsd(raw))})`;
      return { error: null, headline: `${fmt(r.totalUnits, 1)} kWh`, sub, slices: r.slices };
    }
    const { value: u, error } = parseInput(units, "the units you need");
    if (error) return { error, slices: [] as BandSlice[] };
    const r = costForUnits(u, alreadyN);
    const headline = currency === "USD" ? `US$${fmt(zwgToUsd(r.totalZwg))}` : `ZiG ${fmt(r.totalZwg)}`;
    const sub =
      currency === "USD"
        ? `≈ ZiG ${fmt(r.totalZwg)} for ${fmt(u, 1)} kWh`
        : `≈ US$${fmt(zwgToUsd(r.totalZwg))} for ${fmt(u, 1)} kWh`;
    return { error: null, headline, sub, slices: r.slices };
  }, [mode, currency, amount, units, alreadyN]);

  const [copied, setCopied] = useState(false);

  // What actually gets forwarded around family WhatsApp groups: the number,
  // the price, the date it was true, and where to check it.
  const shareText = useMemo(() => {
    if (result.error) return "";
    const context = alreadyN > 0 ? ` (after ${fmt(alreadyN, 0)} units already bought this month)` : " (first purchase of the month)";
    return `ZESA today: ${result.headline} ${result.sub}${context}. Checked on zesa.tapiwa.me`;
  }, [result, alreadyN]);

  const quota = useMemo(() => remainingQuota(alreadyN), [alreadyN]);
  const quotaUsed = Math.min(alreadyN, MONTHLY_QUOTA);
  const quotaPct = Math.round((quotaUsed / MONTHLY_QUOTA) * 100);

  const inputCls =
    // The border swap (line → volt-deep, ≥3:1) plus soft halo IS the focus indicator here;
    // the global 2px offset outline on top of it read as a heavy double ring (operator flag).
    "focus-quiet w-full rounded-lg border border-line bg-card px-4 py-3 text-lg font-mono outline-none transition-shadow focus:border-volt-deep focus:shadow-[0_0_0_4px_rgba(245,184,0,0.18)]";

  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-7">
      {/* Two compact segmented controls: what you're converting, and in which money.
          Neither stretches — a control's width should signal its importance, not fill space. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Calculation direction" className="grid grid-cols-2 gap-1 rounded-lg bg-paper p-1 text-sm font-semibold sm:inline-grid">
          <button
            type="button"
            aria-pressed={mode === "money"}
            onClick={() => setMode("money")}
            className={`min-h-11 whitespace-nowrap rounded-md px-4 py-2 transition sm:px-5 ${mode === "money" ? "bg-ink text-white shadow-sm" : "text-dim hover:text-ink"}`}
          >
            Money → Units
          </button>
          <button
            type="button"
            aria-pressed={mode === "units"}
            onClick={() => setMode("units")}
            className={`min-h-11 whitespace-nowrap rounded-md px-4 py-2 transition sm:px-5 ${mode === "units" ? "bg-ink text-white shadow-sm" : "text-dim hover:text-ink"}`}
          >
            Units → Money
          </button>
        </div>
        <div role="group" aria-label="Currency" className="grid grid-cols-2 gap-1 rounded-lg bg-paper p-1 text-sm font-semibold sm:inline-grid">
          {(["ZWG", "USD"] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={currency === c}
              aria-label={c === "USD" ? "US dollars" : "ZiG (ZWG)"}
              onClick={() => switchCurrency(c)}
              className={`min-h-11 whitespace-nowrap rounded-md px-4 py-2 transition sm:px-5 ${currency === c ? "bg-volt text-ink shadow-sm" : "text-dim hover:text-ink"}`}
            >
              {c === "USD" ? "US$" : "ZiG"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          {mode === "money" ? (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-dim">
                Amount to spend ({currency === "USD" ? "US$" : "ZiG"})
              </span>
              <input type="number" inputMode="decimal" min="0" max={MAX} value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!result.error} aria-describedby={result.error ? "calc-error" : undefined} className={inputCls} />
            </label>
          ) : (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-dim">Units you need (kWh)</span>
              <input type="number" inputMode="decimal" min="0" max={MAX} value={units} onChange={(e) => setUnits(e.target.value)} aria-invalid={!!result.error} aria-describedby={result.error ? "calc-error" : undefined} className={inputCls} />
            </label>
          )}
          {/* One-tap presets live directly under the field they fill —
              93% of visitors are on phones, where typing is the slow part. */}
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Quick amounts">
            {(mode === "money" ? (currency === "USD" ? QUICK_USD : QUICK_ZWG) : QUICK_UNITS).map((v) => {
              const current = mode === "money" ? amount : units;
              const active = parseFloat(current) === v;
              return (
                <button
                  key={`${mode}-${currency}-${v}`}
                  type="button"
                  onClick={() => (mode === "money" ? setAmount(String(v)) : setUnits(String(v)))}
                  aria-pressed={active}
                  className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    active ? "border-volt-deep bg-volt text-ink" : "border-line bg-paper text-dim hover:border-volt-deep hover:text-ink"
                  }`}
                >
                  {mode === "money" ? (currency === "USD" ? `US$${v}` : `ZiG ${v}`) : `${v} units`}
                </button>
              );
            })}
          </div>
        </div>
        <label className="block self-start">
          <span className="mb-1 block text-sm font-medium text-dim">Units already bought this month</span>
          <input type="number" inputMode="decimal" min="0" value={already} onChange={(e) => setAlready(e.target.value)} className={inputCls} />
        </label>
      </div>

      {result.error ? (
        <div role="status" className="mt-6 rounded-xl border border-dashed border-line bg-paper p-5">
          <p className="text-xs uppercase tracking-wider text-dim">{mode === "money" ? "You get" : "You pay"}</p>
          <p id="calc-error" className="font-display mt-1 text-lg font-semibold">{result.error}</p>
          <p className="mt-1 text-sm text-dim">
            {mode === "money"
              ? "Type how much you want to spend and we'll show the units, band by band."
              : "Type how many units you need and we'll show the exact cost, band by band."}
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-xl bg-ink p-5 text-white">
          {/* Wide screens: number left, staircase right — the dark card reads
              as one instrument instead of a headline over empty space. */}
          <div className="sm:flex sm:items-center sm:justify-between sm:gap-8">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-white/60">{mode === "money" ? "You get" : "You pay"}</p>
              <p className="font-display mt-1 text-3xl font-bold text-volt sm:text-4xl">{result.headline}</p>
              <p className="mt-1 text-sm text-white/70">{result.sub}</p>
            </div>
            {/* Your money on the price staircase: reached bands light up,
                the rest stay ghosted. 3D heights = the real per-unit rates. */}
            <TariffStaircase slices={result.slices} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[#25D366] px-4 py-1.5 text-xs font-bold text-ink transition hover:brightness-110"
            >
              <WhatsAppIcon />Share on WhatsApp
            </a>
            <button
              type="button"
              onClick={() => { navigator.clipboard?.writeText(shareText); setCopied(true); setTimeout(() => setCopied(false), 1600); }}
              className="min-h-9 rounded-full border border-white/25 px-4 py-1.5 text-xs font-semibold text-white/80 transition hover:border-white/60 hover:text-white"
            >
              {copied ? "Copied ✓" : "Copy result"}
            </button>
          </div>
        </div>
      )}

      <SliceTable slices={result.slices} currency={currency} />

      <div className="mt-5 rounded-lg border border-volt/60 bg-volt/10 p-4 text-sm leading-relaxed">
        <p className="font-semibold"><BulbIcon />Quota tip</p>
        <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-card">
          <div className="h-1.5 rounded-full bg-volt-deep transition-[width]" style={{ width: `${quotaPct}%` }} />
        </div>
        <p className="mt-2">
          You have used <strong>{fmt(quotaUsed, 0)} of {MONTHLY_QUOTA} kWh</strong> ({quotaPct}%) of this month&apos;s
          discounted quota. Buying your remaining <strong>{fmt(quota.units, 0)} discounted units</strong> before the
          quota resets on the 1st costs <strong>ZiG {fmt(quota.costZwg)}</strong> (≈ US${fmt(zwgToUsd(quota.costZwg))}).
          Anything above 400 kWh in the same month is charged at the top rate.
        </p>
      </div>

      <p className="mt-4 text-xs text-dim">
        Prices include the 6% REA levy. Based on ZERA-approved ZETDC tariffs (billed in ZiG / ZWG). USD figures use
        ≈{fmt(RATE, 1)} ZWG/US$ and are estimates — your bank or wallet rate may differ slightly.
      </p>
    </div>
  );
}import TariffStaircase from "@/components/TariffStaircase";

