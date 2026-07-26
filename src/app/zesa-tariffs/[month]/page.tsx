import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { monthKeys, monthLabel, monthRange, snapshotsForMonth } from "@/lib/history";
import { fmt, zwgToUsd } from "@/lib/tariff";
import { breadcrumb, jsonLdProps } from "@/lib/seo";

export const dynamic = "force-static";

export function generateStaticParams() {
  return monthKeys().map((month) => ({ month }));
}

type Props = { params: Promise<{ month: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { month } = await params;
  const range = monthRange(month);
  if (!range) return {};
  const label = monthLabel(month);
  return {
    title: `ZESA Tariffs ${label} — ZETDC Rates for Zimbabwe, Day by Day`,
    description: `What ZESA (ZETDC) prepaid electricity cost in ${label}: the entry band ranged from ZWG ${fmt(range.min, 4)} to ZWG ${fmt(range.max, 4)} per kWh incl. the 6% REA levy. Every schedule published that month.`,
    alternates: { canonical: `/zesa-tariffs/${month}/` },
  };
}

export default async function MonthPage({ params }: Props) {
  const { month } = await params;
  const rows = snapshotsForMonth(month);
  const range = monthRange(month);
  if (!rows.length || !range) notFound();

  const label = monthLabel(month);
  const months = monthKeys();
  const idx = months.indexOf(month);
  const newer = idx > 0 ? months[idx - 1] : null;
  const older = idx < months.length - 1 ? months[idx + 1] : null;
  const last = rows[rows.length - 1];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdProps(
          breadcrumb([
            ["Current ZESA tariffs", "/zesa-tariffs/"],
            ["Tariff history", "/zesa-tariffs/history/"],
            [label, `/zesa-tariffs/${month}/`],
          ]),
        )}
      />

      <section className="border-b border-line bg-ink text-white">
        <div className="container-page py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-volt">
            Archive · {rows.length} schedule{rows.length === 1 ? "" : "s"} recorded
          </p>
          <h1 className="font-display mt-3 text-3xl font-bold sm:text-4xl">
            ZESA tariffs, {label}
            <span aria-hidden className="text-volt">.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-white/70">
            The first 50 units cost between ZWG {fmt(range.min, 4)} and ZWG {fmt(range.max, 4)} per
            kWh that month, including the 6% REA levy. Rates move with the ZWG, so a monthly figure
            is a range, not a number.
          </p>
          <p className="mt-4 text-sm">
            <Link href="/zesa-tariffs/" className="underline hover:text-volt">
              See today&apos;s rates instead →
            </Link>
          </p>
        </div>
      </section>

      <section className="container-page mt-10">
        <h2 className="font-display text-2xl font-bold">Schedules published in {label}</h2>
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
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().map((s) => (
                  <tr key={s.d} className="border-b border-line/60 last:border-0">
                    <td className="whitespace-nowrap px-2 py-2.5 sm:px-4">{s.d}</td>
                    {s.incl.map((v, i) => (
                      <td key={i} className="px-2 py-2.5 text-right tabular-nums sm:px-4">
                        {fmt(v, 4)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-3 text-sm text-dim">
          At the last {label} schedule, 400 units (the full discounted quota) cost about ZWG{" "}
          {fmt(last.incl[0] * 50 + last.incl[1] * 50 + last.incl[2] * 100 + last.incl[3] * 100 + last.incl[4] * 100)}{" "}
          (≈ US${fmt(zwgToUsd(last.incl[0] * 50 + last.incl[1] * 50 + last.incl[2] * 100 + last.incl[3] * 100 + last.incl[4] * 100))}).
        </p>
      </section>

      <section className="container-page mt-10 mb-4 flex flex-wrap gap-3 text-sm">
        {older && (
          <Link
            href={`/zesa-tariffs/${older}/`}
            className="inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 hover:border-volt"
          >
            ← {monthLabel(older)}
          </Link>
        )}
        {newer && (
          <Link
            href={`/zesa-tariffs/${newer}/`}
            className="inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 hover:border-volt"
          >
            {monthLabel(newer)} →
          </Link>
        )}
        <Link
          href="/zesa-tariffs/history/"
          className="inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 hover:border-volt"
        >
          Full history
        </Link>
      </section>
    </>
  );
}
