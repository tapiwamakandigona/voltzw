import Link from "next/link";
import type { UnitPage } from "@/lib/amounts";
import { AMOUNT_PAGES } from "@/lib/amounts";
import { TARIFFS, MONTHLY_QUOTA, fmt, costForUnits } from "@/lib/tariff";
import { APPLIANCES, daysOfQuotaUse, formatDuration, runtimeFor } from "@/lib/appliances";
import { WhatItRuns } from "@/components/WhatItRuns";
import { monthLabel, priceChangeForUnits } from "@/lib/history";
import { UNIT_COPY } from "@/lib/copy";
import { breadcrumb, jsonLdProps } from "@/lib/seo";

/** Static "how much is N units of ZESA" page — the inverse of the
 *  money→units amount pages, sharing the same band maths and daily sync. */
export function UnitCostPage({ page, others }: { page: UnitPage; others: UnitPage[] }) {
  const { totalZwg, slices } = costForUnits(page.units);
  const quotaShare = (page.units / MONTHLY_QUOTA) * 100;
  const avgPerKwh = totalZwg / page.units;
  const marginal = slices[slices.length - 1]?.band;
  const move = priceChangeForUnits(page.units);
  const lastsDays = daysOfQuotaUse(page.units);
  // The money page that lands closest to this many units, so the two
  // directions of the same question link to each other.
  const nearestAmount = [...AMOUNT_PAGES].sort(
    (a, b) => Math.abs(a.units - page.units) - Math.abs(b.units - page.units),
  )[0];

  const faq = [
    {
      q: `Is ${page.units} units of ZESA always ZWG ${fmt(totalZwg)}?`,
      a: `No. ZESA uses a stepped tariff, so the price depends on how much you have already bought this calendar month. ZWG ${fmt(totalZwg)} assumes this is your first purchase of the month, starting from the cheapest band. Later purchases in the same month cost more per unit.`,
    },
    {
      q: "Can I pay for ZESA in US dollars?",
      a: `ZETDC bills in ZWG. The ≈ US$${fmt(page.costUsd)} figure uses the published reference rate of about ${fmt(TARIFFS.zwgPerUsdApprox, 1)} ZWG per US$; USD payment channels convert at the rate they offer on the day.`,
    },
    {
      q: `How long does ${page.units} units of ZESA last?`,
      a: `About ${formatDuration(lastsDays * 24)} for a household that would otherwise use its full ${MONTHLY_QUOTA} kWh quota in a month (≈ ${fmt(MONTHLY_QUOTA / 30, 1)} kWh a day). Run less than that and it stretches further: ${page.units} units is ${formatDuration(runtimeFor(page.units, APPLIANCES[0]).hours)} of a 3 kW geyser, or ${formatDuration(runtimeFor(page.units, APPLIANCES[APPLIANCES.length - 1]).hours)} of a fridge on its own.`,
    },
    {
      q: "Do these prices include the REA levy?",
      a: `Yes. Every figure on this page includes the 6% Rural Electrification levy, exactly as ZETDC charges it. Rates are the ZERA-approved schedule effective ${TARIFFS.effectiveDate}.`,
    },
  ];

  const jsonLd = [
    breadcrumb([["ZESA amounts", "/units/"], [page.display, `/units/${page.slug}/`]]),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdProps(...jsonLd)} />

      <section className="border-b border-line bg-ink text-white">
        <div className="container-page py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-volt">
            ZETDC tariffs effective {TARIFFS.effectiveDate}
          </p>
          <h1 className="font-display mt-3 text-3xl font-bold sm:text-4xl">
            How much is {page.units} units of ZESA
            <span aria-hidden className="text-volt">?</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80">
            {page.units} units (kWh) of prepaid electricity costs{" "}
            <strong className="text-volt">ZWG {fmt(totalZwg)}</strong> — about US$
            {fmt(page.costUsd)} — as your first purchase this month, including the 6% REA levy.
          </p>
        </div>
      </section>

      {UNIT_COPY[page.units] ? (
        <section className="container-page mt-8 max-w-3xl">
          <p className="text-lg leading-relaxed">{UNIT_COPY[page.units]}</p>
        </section>
      ) : null}

      <section className="container-page mt-10">
        <h2 className="font-display text-2xl font-bold">Band-by-band breakdown</h2>
        <p className="mt-2 max-w-2xl text-dim">
          ZESA charges in six steps each month. Here is exactly what {page.units} units costs.
        </p>
        <div className="mt-5 rounded-2xl border border-line bg-card shadow-sm">
          <div className="overflow-x-auto rounded-2xl">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-line bg-paper text-left text-xs uppercase tracking-wider text-dim">
                  <th className="px-2 py-3 font-medium sm:px-4">Band</th>
                  <th className="px-2 py-3 text-right font-medium sm:px-4">Units</th>
                  <th className="px-2 py-3 text-right font-medium sm:px-4">ZWG/unit</th>
                  <th className="px-2 py-3 text-right font-medium sm:px-4">Cost</th>
                </tr>
              </thead>
              <tbody>
                {slices.map((s) => (
                  <tr key={s.band.label} className="border-b border-line/60 last:border-0">
                    <td className="px-2 py-3 sm:px-4">{s.band.label}</td>
                    <td className="px-2 py-3 text-right tabular-nums sm:px-4">{fmt(s.units, 1)}</td>
                    <td className="px-2 py-3 text-right tabular-nums sm:px-4">{fmt(s.band.inclLevyZwg, 4)}</td>
                    <td className="px-2 py-3 text-right tabular-nums sm:px-4">ZWG {fmt(s.costZwg)}</td>
                  </tr>
                ))}
                <tr className="bg-paper font-semibold">
                  <td className="px-2 py-3 sm:px-4">Total</td>
                  <td className="px-2 py-3 text-right tabular-nums sm:px-4">{fmt(page.units, 1)}</td>
                  <td className="px-2 py-3 text-right sm:px-4">—</td>
                  <td className="px-2 py-3 text-right tabular-nums sm:px-4">
                    ZWG {fmt(totalZwg)} <span className="font-normal text-dim">(≈ US${fmt(page.costUsd)})</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-4 text-sm text-dim">
          That is {fmt(quotaShare, 0)}% of your {MONTHLY_QUOTA} kWh discounted monthly quota. Anything
          above the quota in the same month is charged at the top band rate.
        </p>
      </section>


      <WhatItRuns units={page.units} label={`${page.units} units`} />

      <section className="container-page mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">
          <h2 className="font-display text-xl font-bold">Average price you pay</h2>
          <p className="mt-2 text-dim">
            ZWG {fmt(totalZwg)} for {page.units} units works out at{" "}
            <strong className="text-ink">ZWG {fmt(avgPerKwh, 4)} per kWh</strong> across the bands
            you touch{marginal ? <> — your last unit is charged in the “{marginal.label}” band at ZWG {fmt(marginal.inclLevyZwg, 4)}</> : null}.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">
          <h2 className="font-display text-xl font-bold">Versus the last schedule</h2>
          {move ? (
            <p className="mt-2 text-dim">
              The same {page.units} units cost{" "}
              <strong className="text-ink">ZWG {fmt(move.then)}</strong> under the schedule effective{" "}
              {move.thenDate} ({monthLabel(move.thenDate.slice(0, 7))}) — a change of{" "}
              <strong className="text-ink">
                {move.pct >= 0 ? "+" : ""}
                {fmt(move.pct, 1)}%
              </strong>
              .{" "}
              <Link href="/zesa-tariffs/history/" className="underline hover:text-volt-deep">
                See every schedule
              </Link>
              .
            </p>
          ) : (
            <p className="mt-2 text-dim">
              Only one schedule is on record so far, so there is nothing to compare against yet.{" "}
              <Link href="/zesa-tariffs/history/" className="underline hover:text-volt-deep">
                Tariff history
              </Link>
              .
            </p>
          )}
        </div>
      </section>

      <section className="container-page mt-10">
        <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">
          <h2 className="font-display text-xl font-bold">Starting from money instead?</h2>
          <p className="mt-2 text-dim">
            {nearestAmount.display} is the closest common purchase — it buys about{" "}
            {fmt(nearestAmount.units, 1)} kWh.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {AMOUNT_PAGES.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/units/${a.slug}/`}
                  className="inline-flex min-h-11 items-center rounded-lg border border-line bg-paper px-3 text-sm hover:border-volt"
                >
                  {a.display} = {fmt(a.units, 1)} kWh
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="container-page mt-10">
        <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">
          <h2 className="font-display text-xl font-bold">Already bought units this month?</h2>
          <p className="mt-2 text-dim">
            Then {page.units} units costs more than ZWG {fmt(totalZwg)}, because your cheap bands
            are already used. The calculator takes that into account — enter what you have bought so
            far.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-volt px-4 font-display font-semibold text-ink"
          >
            Open the ZESA calculator →
          </Link>
        </div>
      </section>

      <section className="container-page mt-10">
        <h2 className="font-display text-2xl font-bold">Other unit amounts</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {others.map((o) => (
            <li key={o.slug}>
              <Link
                href={`/units/${o.slug}/`}
                className="inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 text-sm hover:border-volt"
              >
                {o.display} = ZWG {fmt(o.costZwg)}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-dim">
          <Link href="/units/" className="underline hover:text-volt-deep">
            See every amount
          </Link>{" "}
          ·{" "}
          <Link href="/zesa-tariffs/" className="underline hover:text-volt-deep">
            Current tariff table
          </Link>{" "}
          ·{" "}
          <Link href="/zesa-tariffs/history/" className="underline hover:text-volt-deep">
            How rates have moved
          </Link>
        </p>
      </section>

      <section className="container-page mt-12">
        <h2 className="font-display text-2xl font-bold">Questions</h2>
        <dl className="mt-4 divide-y divide-line rounded-2xl border border-line bg-card">
          {faq.map((f) => (
            <div key={f.q} className="p-5">
              <dt className="font-display font-semibold">{f.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-dim">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
