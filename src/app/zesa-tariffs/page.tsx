import type { Metadata } from "next";
import Link from "next/link";
import { TARIFFS, BANDS, costForUnits, fmt, zwgToUsd } from "@/lib/tariff";
import { BulbIcon, WrenchIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Current ZESA Tariffs — ZETDC Stepped Tariff Bands Explained",
  description:
    "The latest ZERA-approved ZESA (ZETDC) electricity tariffs for Zimbabwe: all six stepped tariff bands in ZWG and USD, the 6% REA levy, and how the 400 kWh monthly quota works.",
  alternates: { canonical: "/zesa-tariffs/" },
};

export default function TariffsPage() {
  const cumulative: { label: string; upTo: number; total: number }[] = [];
  for (const cap of [50, 100, 200, 300, 400]) {
    cumulative.push({ label: `${cap} units`, upTo: cap, total: costForUnits(cap).totalZwg });
  }
  const fullQuota = costForUnits(400).totalZwg;

  return (
    <>
      <section className="border-b border-line bg-ink text-white">
        <div className="container-page py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-volt">
            Effective {TARIFFS.effectiveDate} · verified {TARIFFS.lastVerified}
          </p>
          <h1 className="font-display mt-3 text-4xl font-bold">Current ZESA tariffs</h1>
          <p className="mt-3 max-w-2xl text-white/70">
            ZERA-approved ZETDC prepaid tariffs — every band, with and without the 6% Rural Electrification (REA) levy.
          </p>
        </div>
      </section>

      <section className="container-page mt-10">
        <div className="overflow-x-auto rounded-2xl border border-line bg-card shadow-sm">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-line bg-paper text-left text-xs uppercase tracking-wider text-dim">
                <th className="px-2.5 py-3 sm:px-4 font-medium">Consumption band (monthly)</th>
                <th className="px-2.5 py-3 sm:px-4 text-right font-medium">Base ZWG/unit</th>
                <th className="px-2.5 py-3 sm:px-4 text-right font-medium">Incl. 6% REA</th>
                <th className="px-2.5 py-3 sm:px-4 text-right font-medium">≈ USD/unit</th>
              </tr>
            </thead>
            <tbody>
              {BANDS.map((b) => (
                <tr key={b.label} className="border-b border-line last:border-0">
                  <td className="px-2.5 py-3 sm:px-4 font-medium">{b.label}</td>
                  <td className="px-2.5 py-3 sm:px-4 text-right font-mono">{fmt(b.baseZwg, 4)}</td>
                  <td className="px-2.5 py-3 sm:px-4 text-right font-mono font-semibold">{fmt(b.inclLevyZwg, 4)}</td>
                  <td className="px-2.5 py-3 sm:px-4 text-right font-mono">${fmt(b.usdApprox)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-dim">
          Source: ZERA-approved ZETDC schedule via Zimpricecheck & Magetsi. USD estimates only — you pay in ZWG unless
          using a USD channel. We verify this table against published rates and update it whenever tariffs change.
        </p>
      </section>

      <section className="container-page mt-14 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl font-bold">How the stepped tariff works</h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-dim">
            <p>
              ZESA does not charge a flat rate. Each calendar month, your meter starts at the cheapest band: the first
              50 units cost ZWG {fmt(BANDS[0].inclLevyZwg)} each. The next 50 cost a little more, and so on — six bands
              in total. The more you buy in a month, the more each extra unit costs.
            </p>
            <p>
              Your <strong className="text-ink">discounted quota is 400 kWh per month</strong>. Buying the full quota costs about
              ZWG {fmt(fullQuota)} (≈ US${fmt(zwgToUsd(fullQuota))}). Every unit beyond 400 kWh in the same month is
              charged at the top rate of ZWG {fmt(BANDS[5].inclLevyZwg)} — more than three times the entry band.
            </p>
            <p>
              <strong className="text-ink">The quota resets on the 1st of every month.</strong> That is why people say electricity is
              &ldquo;cheaper at the beginning of the month&rdquo; — prices never change with the date, but your cheap
              bands are available again.
            </p>
            <p>
              Your location makes no difference: high-density, medium-density or low-density, the tariff is the same.
              Only your monthly consumption — and whether it is your first purchase of the month — affects the price.
            </p>
          </div>
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold">What it costs, cumulatively</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-card shadow-sm">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-line bg-paper text-left text-xs uppercase tracking-wider text-dim">
                  <th className="px-2.5 py-3 sm:px-4 font-medium">Buying up to…</th>
                  <th className="px-2.5 py-3 sm:px-4 text-right font-medium">Total ZWG</th>
                  <th className="px-2.5 py-3 sm:px-4 text-right font-medium">≈ USD</th>
                </tr>
              </thead>
              <tbody>
                {cumulative.map((c) => (
                  <tr key={c.label} className="border-b border-line last:border-0">
                    <td className="px-2.5 py-3 sm:px-4 font-medium">{c.label}</td>
                    <td className="px-2.5 py-3 sm:px-4 text-right font-mono">{fmt(c.total)}</td>
                    <td className="px-2.5 py-3 sm:px-4 text-right font-mono">${fmt(zwgToUsd(c.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 rounded-lg border border-volt/60 bg-volt/10 p-4 text-sm leading-relaxed">
            <p className="font-semibold"><BulbIcon />Money-saving rule of thumb</p>
            <p className="mt-1">
              If your household uses more than 400 kWh a month, split large purchases across the month boundary: top up
              to your quota before the 1st, then buy the rest after the reset. Use the{" "}
              <Link href="/" className="font-semibold underline">calculator</Link> with &ldquo;units already bought&rdquo;
              to see your exact price before you pay.
            </p>
          </div>
          <div className="mt-5 rounded-lg border border-line bg-white p-4 text-sm leading-relaxed">
            <p className="font-semibold"><WrenchIcon />For developers</p>
            <p className="mt-1">
              These tariffs are available as a free JSON API — we track ZERA rate changes and keep it current:{" "}
              <a href="/api/tariffs.json" className="font-mono text-xs font-semibold underline">
                zesa.tapiwa.me/api/tariffs.json
              </a>
            </p>
          </div>
        </div>
      </section>

      <section className="container-page mt-14">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-ink p-6 text-white sm:flex-row sm:items-center sm:p-8">
          <div>
            <h2 className="font-display text-xl font-bold">Ready to top up?</h2>
            <p className="mt-1 text-sm text-white/70">Buy ZESA tokens with EcoCash in USD or ZWG — token on screen and by SMS.</p>
          </div>
          <Link href="/buy/" className="shrink-0 rounded-lg bg-volt px-6 py-3 font-semibold text-ink transition hover:bg-volt-deep hover:text-white">
            Buy tokens →
          </Link>
        </div>
      </section>
    </>
  );
}
