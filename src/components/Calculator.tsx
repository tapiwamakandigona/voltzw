"use client";

import { useMemo, useState } from "react";
import {
  costForUnits, unitsForAmount, remainingQuota, zwgToUsd, fmt,
  MONTHLY_QUOTA, type BandSlice,
} from "@/lib/tariff";

type Mode = "money" | "units";

function SliceTable({ slices }: { slices: BandSlice[] }) {
  if (slices.length === 0) return null;
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-line bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-dim">
            <th className="px-3 py-2 font-medium">Band</th>
            <th className="px-3 py-2 text-right font-medium">Units</th>
            <th className="px-3 py-2 text-right font-medium">ZWG/unit</th>
            <th className="px-3 py-2 text-right font-medium">Cost</th>
          </tr>
        </thead>
        <tbody>
          {slices.map((s, i) => (
            <tr key={i} className="border-b border-line last:border-0">
              <td className="px-3 py-2">{s.band.label}</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(s.units, 1)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmt(s.band.inclLevyZwg, 4)}</td>
              <td className="px-3 py-2 text-right font-mono">ZWG {fmt(s.costZwg)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Calculator() {
  const [mode, setMode] = useState<Mode>("money");
  const [amount, setAmount] = useState<string>("500");
  const [units, setUnits] = useState<string>("100");
  const [already, setAlready] = useState<string>("0");

  const alreadyN = Math.max(0, parseFloat(already) || 0);

  const result = useMemo(() => {
    if (mode === "money") {
      const amt = Math.max(0, parseFloat(amount) || 0);
      const r = unitsForAmount(amt, alreadyN);
      return { headline: `${fmt(r.totalUnits, 1)} kWh`, sub: `for ZWG ${fmt(amt)} (≈ US$${fmt(zwgToUsd(amt))})`, slices: r.slices };
    }
    const u = Math.max(0, parseFloat(units) || 0);
    const r = costForUnits(u, alreadyN);
    return { headline: `ZWG ${fmt(r.totalZwg)}`, sub: `≈ US$${fmt(zwgToUsd(r.totalZwg))} for ${fmt(u, 1)} kWh`, slices: r.slices };
  }, [mode, amount, units, alreadyN]);

  const quota = useMemo(() => remainingQuota(alreadyN), [alreadyN]);
  const quotaUsed = Math.min(alreadyN, MONTHLY_QUOTA);
  const quotaPct = Math.round((quotaUsed / MONTHLY_QUOTA) * 100);

  const inputCls =
    "w-full rounded-lg border border-line bg-card px-4 py-3 text-lg font-mono outline-none focus:border-volt-deep focus:ring-2 focus:ring-volt/40";

  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-7">
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-paper p-1 text-sm font-semibold">
        <button
          onClick={() => setMode("money")}
          className={`rounded-md px-3 py-2 transition ${mode === "money" ? "bg-ink text-white" : "text-dim hover:text-ink"}`}
        >
          Money → Units
        </button>
        <button
          onClick={() => setMode("units")}
          className={`rounded-md px-3 py-2 transition ${mode === "units" ? "bg-ink text-white" : "text-dim hover:text-ink"}`}
        >
          Units → Money
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {mode === "money" ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-dim">Amount to spend (ZWG)</span>
            <input type="number" inputMode="decimal" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
          </label>
        ) : (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-dim">Units you need (kWh)</span>
            <input type="number" inputMode="decimal" min="0" value={units} onChange={(e) => setUnits(e.target.value)} className={inputCls} />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-dim">Units already bought this month</span>
          <input type="number" inputMode="decimal" min="0" value={already} onChange={(e) => setAlready(e.target.value)} className={inputCls} />
        </label>
      </div>

      <div className="mt-6 rounded-xl bg-ink p-5 text-white">
        <p className="text-xs uppercase tracking-wider text-white/60">You get</p>
        <p className="font-display mt-1 text-4xl font-bold text-volt">{result.headline}</p>
        <p className="mt-1 text-sm text-white/70">{result.sub}</p>
      </div>

      <SliceTable slices={result.slices} />

      <div className="mt-5 rounded-lg border border-volt/60 bg-volt/10 p-4 text-sm leading-relaxed">
        <p className="font-semibold">💡 Quota tip</p>
        <p className="mt-1">
          You have used <strong>{fmt(quotaUsed, 0)} of {MONTHLY_QUOTA} kWh</strong> ({quotaPct}%) of this month&apos;s
          discounted quota. Buying your remaining <strong>{fmt(quota.units, 0)} discounted units</strong> before the
          quota resets on the 1st costs <strong>ZWG {fmt(quota.costZwg)}</strong> (≈ US${fmt(zwgToUsd(quota.costZwg))}).
          Anything above 400 kWh in the same month is charged at the top rate.
        </p>
      </div>

      <p className="mt-4 text-xs text-dim">
        Prices include the 6% REA levy. Based on ZERA-approved ZETDC tariffs. USD figures are estimates.
      </p>
    </div>
  );
}
