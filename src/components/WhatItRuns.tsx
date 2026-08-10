import { APPLIANCES, daysOfQuotaUse, formatDuration, runtimeFor } from "@/lib/appliances";
import { MONTHLY_QUOTA, fmt } from "@/lib/tariff";

/** "What N units actually runs" — the question people ask straight after the
 *  price. Shared by both directions of the /units pages (money → units and
 *  units → money) so each page carries the same honest appliance maths with
 *  its own numbers. */
export function WhatItRuns({ units, label }: { units: number; label: string }) {
  const lastsHours = daysOfQuotaUse(units) * 24;
  return (
    <section className="container-page mt-10">
      <h2 className="font-display text-2xl font-bold">What {label} actually runs</h2>
      <p className="mt-2 max-w-2xl text-dim">
        {fmt(units, 1)} kWh is about <strong className="text-ink">{formatDuration(lastsHours)}</strong>{" "}
        for a household that would otherwise burn through the whole {MONTHLY_QUOTA} kWh quota in a
        month. Spent on one appliance at a time, it goes this far:
      </p>
      <div className="mt-5 rounded-2xl border border-line bg-card shadow-sm">
        <div className="overflow-x-auto rounded-2xl">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-line bg-paper text-left text-xs uppercase tracking-wider text-dim">
                <th className="px-2 py-3 font-medium sm:px-4">Appliance</th>
                <th className="px-2 py-3 text-right font-medium sm:px-4">Typical draw</th>
                <th className="px-2 py-3 text-right font-medium sm:px-4">Runs for</th>
              </tr>
            </thead>
            <tbody>
              {APPLIANCES.map((a) => (
                <tr key={a.name} className="border-b border-line/60 last:border-0">
                  <td className="px-2 py-3 sm:px-4">{a.name}</td>
                  <td className="px-2 py-3 text-right tabular-nums text-dim sm:px-4">
                    {a.watts ? `${fmt(a.watts, 0)} W` : `${fmt(a.kwhPerDay ?? 0, 1)} kWh/day`}
                  </td>
                  <td className="px-2 py-3 text-right font-medium tabular-nums sm:px-4">
                    {runtimeFor(units, a).label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 text-xs text-dim">
        Wattages are typical nameplate figures for appliances sold in Zimbabwe, not metered
        readings — treat them as a guide to where your units go.
      </p>
    </section>
  );
}
