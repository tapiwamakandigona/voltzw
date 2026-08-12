import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AMOUNT_PAGES, UNIT_PAGES, findAmountPage, findUnitPage, siblings, unitSiblings } from "@/lib/amounts";
import { TARIFFS, MONTHLY_QUOTA, RATE, fmt, unitsForAmount, zwgToUsd } from "@/lib/tariff";
import { WhatItRuns } from "@/components/WhatItRuns";
import { formatDuration, daysOfQuotaUse } from "@/lib/appliances";
import { monthLabel, priceChangeForUnits } from "@/lib/history";
import { AMOUNT_COPY } from "@/lib/copy";
import { breadcrumb, jsonLdProps } from "@/lib/seo";
import { UnitCostPage } from "./unit-cost";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [
    ...AMOUNT_PAGES.map((p) => ({ slug: p.slug })),
    ...UNIT_PAGES.map((p) => ({ slug: p.slug })),
  ];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const unitPage = findUnitPage(slug);
  if (unitPage) {
    return {
      title: `How Much Is ${unitPage.units} Units of ZESA? ZWG ${fmt(unitPage.costZwg)} / ≈ US$${fmt(unitPage.costUsd)} (${TARIFFS.effectiveDate})`,
      description: `${unitPage.units} units (kWh) of ZESA prepaid electricity costs ZWG ${fmt(unitPage.costZwg)} — about US$${fmt(unitPage.costUsd)} — at the ZERA-approved ZETDC tariffs effective ${TARIFFS.effectiveDate}, including the 6% REA levy. Band-by-band breakdown, updated daily.`,
      alternates: { canonical: `/units/${unitPage.slug}/` },
    };
  }
  const page = findAmountPage(slug);
  if (!page) return {};
  const units = fmt(page.units, 1);
  return {
    title: `How many ZESA units is ${page.display}${page.currency === "ZWG" ? " (ZWG)" : ""}? ${units} kWh in Zimbabwe (${TARIFFS.effectiveDate})`,
    description: `${page.display} buys ${units} kWh of ZESA prepaid electricity at the ZERA-approved ZETDC tariffs effective ${TARIFFS.effectiveDate}, including the 6% REA levy. Full band-by-band breakdown for Zimbabwe, updated daily.`,
    alternates: { canonical: `/units/${page.slug}/` },
  };
}

export default async function UnitsPage({ params }: Props) {
  const { slug } = await params;
  const unitPage = findUnitPage(slug);
  if (unitPage) return <UnitCostPage page={unitPage} others={unitSiblings(unitPage)} />;
  const page = findAmountPage(slug);
  if (!page) notFound();

  const { totalUnits, slices } = unitsForAmount(page.amountZwg);
  const usd = zwgToUsd(page.amountZwg);
  const quotaShare = (totalUnits / MONTHLY_QUOTA) * 100;
  const others = siblings(page, 6);
  const move = priceChangeForUnits(totalUnits);
  // The units-first page closest to what this amount buys, so both directions
  // of the same question are one click apart.
  const nearestUnitPage = [...UNIT_PAGES].sort(
    (a, b) => Math.abs(a.units - totalUnits) - Math.abs(b.units - totalUnits),
  )[0];

  const faq = [
    {
      q: `Is ${page.display} of ZESA always ${fmt(totalUnits, 1)} units?`,
      a: `No. ZESA uses a stepped tariff, so the answer depends on how much you have already bought this calendar month. ${fmt(totalUnits, 1)} kWh assumes this is your first purchase of the month, starting from the cheapest band. Later purchases in the same month buy fewer units for the same money.`,
    },
    {
      q: `How long does ${page.display} of ZESA last?`,
      a: `${page.display} buys ${fmt(totalUnits, 1)} kWh, which is about ${formatDuration(daysOfQuotaUse(totalUnits) * 24)} for a household that would otherwise use its full ${MONTHLY_QUOTA} kWh monthly quota (≈ ${fmt(MONTHLY_QUOTA / 30, 1)} kWh a day). Use less than that and it lasts proportionally longer.`,
    },
    {
      q: "Do these prices include the REA levy?",
      a: `Yes. Every figure on this page includes the 6% Rural Electrification levy, exactly as ZETDC charges it. Rates are the ZERA-approved schedule effective ${TARIFFS.effectiveDate}.`,
    },
  ];

  const jsonLd = [
    breadcrumb([["ZESA amounts", "/units/"], [`${page.display}`, `/units/${page.slug}/`]]),
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
            How many ZESA units is {page.display}
            <span aria-hidden className="text-volt">?</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80">
            {page.display} buys{" "}
            <strong className="text-volt">{fmt(totalUnits, 1)} kWh</strong> of prepaid electricity
            in Zimbabwe — as your first purchase this month, including the 6% REA levy.
          </p>
          {page.currency === "USD" && (
            <p className="mt-2 text-sm text-white/60">
              Converted at the published reference rate of ≈ {fmt(RATE, 1)} ZWG per US$, i.e. about
              ZWG {fmt(page.amountZwg)}. You pay ZETDC in ZWG unless you use a USD channel.
            </p>
          )}
        </div>
      </section>

      {AMOUNT_COPY[page.slug] ? (
        <section className="container-page mt-8 max-w-3xl">
          <p className="text-lg leading-relaxed">{AMOUNT_COPY[page.slug]}</p>
        </section>
      ) : null}

      <section className="container-page mt-10">
        <h2 className="font-display text-2xl font-bold">Band-by-band breakdown</h2>
        <p className="mt-2 max-w-2xl text-dim">
          ZESA charges in six steps each month. Here is exactly where {page.display} lands.
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
                  <td className="px-2 py-3 text-right tabular-nums sm:px-4">{fmt(totalUnits, 1)}</td>
                  <td className="px-2 py-3 text-right sm:px-4">—</td>
                  <td className="px-2 py-3 text-right tabular-nums sm:px-4">
                    ZWG {fmt(page.amountZwg)} <span className="font-normal text-dim">(≈ US${fmt(usd)})</span>
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

      <WhatItRuns units={totalUnits} label={page.display} />

      <section className="container-page mt-10">
        <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">
          <h2 className="font-display text-xl font-bold">Versus the last schedule</h2>
          {move ? (
            <p className="mt-2 text-dim">
              The same {fmt(totalUnits, 1)} kWh cost{" "}
              <strong className="text-ink">ZWG {fmt(move.then)}</strong> under the schedule effective{" "}
              {move.thenDate} ({monthLabel(move.thenDate.slice(0, 7))}) — a change of{" "}
              <strong className="text-ink">
                {move.pct >= 0 ? "+" : ""}
                {fmt(move.pct, 1)}%
              </strong>
              , which is why the same note buys a different number of units month to month.{" "}
              <Link href="/zesa-tariffs/history/" className="underline hover:text-volt-deep">
                See every schedule
              </Link>
              .
            </p>
          ) : (
            <p className="mt-2 text-dim">
              Only one schedule is on record so far, so there is nothing to compare against yet.
            </p>
          )}
        </div>
      </section>

      <section className="container-page mt-10">
        <h2 className="font-display text-2xl font-bold">Or start from the units</h2>
        <p className="mt-2 max-w-2xl text-dim">
          Working the other way round — what a fixed number of units costs as a first purchase this
          month. {page.display} lands nearest to{" "}
          <Link href={`/units/${nearestUnitPage.slug}/`} className="underline hover:text-volt-deep">
            {nearestUnitPage.display}
          </Link>
          .
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {UNIT_PAGES.map((u) => (
            <li key={u.slug}>
              <Link
                href={`/units/${u.slug}/`}
                className="inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 text-sm hover:border-volt"
              >
                {u.display} = ZWG {fmt(u.costZwg)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page mt-10">
        <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">
          <h2 className="font-display text-xl font-bold">Already bought units this month?</h2>
          <p className="mt-2 text-dim">
            Then {page.display} buys less than {fmt(totalUnits, 1)} kWh, because your cheap bands are
            already used. The calculator takes that into account — enter what you have bought so far.
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
        <h2 className="font-display text-2xl font-bold">Other amounts</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {others.map((o) => (
            <li key={o.slug}>
              <Link
                href={`/units/${o.slug}/`}
                className="inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 text-sm hover:border-volt"
              >
                {o.display} = {fmt(o.units, 1)} kWh
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
