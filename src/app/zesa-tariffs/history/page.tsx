import type { Metadata } from "next";
import Link from "next/link";
import {
  HISTORY,
  FIRST_DATE,
  LATEST,
  changeCount,
  entryBandSeries,
  monthKeys,
  monthLabel,
  sparklinePoints,
  totalDriftPct,
} from "@/lib/history";
import { TARIFFS, fmt } from "@/lib/tariff";
import { breadcrumb, jsonLdProps, tariffDataset } from "@/lib/seo";

export const metadata: Metadata = {
  title: `ZESA Tariff History — Every ZETDC Rate Change in Zimbabwe Since ${FIRST_DATE}`,
  description: `The only public record of ZESA (ZETDC) prepaid electricity price changes: ${HISTORY.length} daily-verified schedules from ${FIRST_DATE} to ${LATEST?.d}, all six bands in ZWG, free as JSON and CSV.`,
  alternates: { canonical: "/zesa-tariffs/history/" },
};

export default function HistoryPage() {
  const series = entryBandSeries();
  const values = series.map((s) => s.v);
  const drift = totalDriftPct();
  const changes = changeCount();
  const W = 720;
  const H = 180;
  const points = sparklinePoints(values, W, H);
  const rows = [...HISTORY].reverse();

  const jsonLd = [
    breadcrumb([
      ["Current ZESA tariffs", "/zesa-tariffs/"],
      ["Tariff history", "/zesa-tariffs/history/"],
    ]),
    tariffDataset({ effectiveDate: TARIFFS.effectiveDate, firstDate: FIRST_DATE, rows: HISTORY.length }),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdProps(...jsonLd)} />

      <section className="border-b border-line bg-ink text-white">
        <div className="container-page py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-volt">
            {HISTORY.length} schedules · {FIRST_DATE} → {LATEST?.d}
          </p>
          <h1 className="font-display mt-3 text-3xl font-bold sm:text-4xl">
            ZESA tariff history<span aria-hidden className="text-volt">.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-white/70">
            ZESA prices are not fixed — they move with the ZWG. We capture the ZERA-approved ZETDC
            schedule every morning, so this is a continuous public record rather than a snapshot.
            The entry band has moved{" "}
            <strong className="text-volt">{drift >= 0 ? "+" : ""}{fmt(drift, 1)}%</strong> since{" "}
            {FIRST_DATE}, across {changes} recorded changes.
          </p>
        </div>
      </section>

      <section className="container-page mt-10">
        <h2 className="font-display text-2xl font-bold">First 50 units, ZWG per kWh (incl. levy)</h2>
        <div className="mt-5 rounded-2xl border border-line bg-card p-4 shadow-sm">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-44 w-full"
            role="img"
            aria-label={`Entry band price from ${fmt(Math.min(...values), 4)} to ${fmt(Math.max(...values), 4)} ZWG per kWh between ${FIRST_DATE} and ${LATEST?.d}`}
          >
            <polyline
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-volt-deep"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mt-2 flex justify-between text-xs text-dim">
            <span>{FIRST_DATE} · ZWG {fmt(values[0], 4)}</span>
            <span>{LATEST?.d} · ZWG {fmt(values[values.length - 1], 4)}</span>
          </div>
        </div>
      </section>

      <section className="container-page mt-10">
        <h2 className="font-display text-2xl font-bold">Free data, with attribution</h2>
        <p className="mt-2 max-w-2xl text-dim">
          Use it in research, dashboards or your own app — link back to zesa.tapiwa.me.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2 text-sm">
          <li>
            <a
              href="/api/v1/tariffs.json"
              className="inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 hover:border-volt"
            >
              Current tariffs (JSON)
            </a>
          </li>
          <li>
            <a
              href="/api/v1/tariff-history.json"
              className="inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 hover:border-volt"
            >
              Full history (JSON)
            </a>
          </li>
          <li>
            <a
              href="/api/v1/tariff-history.csv"
              className="inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 hover:border-volt"
            >
              Full history (CSV)
            </a>
          </li>
        </ul>
      </section>

      <section className="container-page mt-10">
        <h2 className="font-display text-2xl font-bold">Monthly archives</h2>
        <ul className="mt-4 flex flex-wrap gap-2 text-sm">
          {monthKeys().map((k) => (
            <li key={k}>
              <Link
                href={`/zesa-tariffs/${k}/`}
                className="inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 hover:border-volt"
              >
                {monthLabel(k)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page mt-10 mb-4">
        <h2 className="font-display text-2xl font-bold">Every recorded schedule</h2>
        <div className="mt-5 rounded-2xl border border-line bg-card shadow-sm">
          <div className="overflow-x-auto rounded-2xl">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-line bg-paper text-left text-xs uppercase tracking-wider text-dim">
                  <th className="px-2 py-3 font-medium sm:px-4">Effective</th>
                  <th className="px-2 py-3 text-right font-medium sm:px-4">1–50</th>
                  <th className="px-2 py-3 text-right font-medium sm:px-4">51–100</th>
                  <th className="px-2 py-3 text-right font-medium sm:px-4">101–200</th>
                  <th className="px-2 py-3 text-right font-medium sm:px-4">201–300</th>
                  <th className="px-2 py-3 text-right font-medium sm:px-4">301–400</th>
                  <th className="px-2 py-3 text-right font-medium sm:px-4">400+</th>
                  <th className="px-2 py-3 text-right font-medium sm:px-4">ZWG/US$</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.d} className="border-b border-line/60 last:border-0">
                    <td className="whitespace-nowrap px-2 py-2.5 sm:px-4">{s.d}</td>
                    {s.incl.map((v, i) => (
                      <td key={i} className="px-2 py-2.5 text-right tabular-nums sm:px-4">
                        {fmt(v, 4)}
                      </td>
                    ))}
                    <td className="px-2 py-2.5 text-right tabular-nums sm:px-4">{fmt(s.fx, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-3 text-xs text-dim">
          Prices include the 6% Rural Electrification levy, stored exactly as published. Source:
          ZERA-approved ZETDC schedules via Zimpricecheck and Magetsi.
        </p>
      </section>
    </>
  );
}
