import type { Metadata } from "next";
import Link from "next/link";
import { AMOUNT_PAGES, UNIT_PAGES } from "@/lib/amounts";
import { TARIFFS, MONTHLY_QUOTA, RATE, fmt } from "@/lib/tariff";
import { daysOfQuotaUse, formatDuration } from "@/lib/appliances";
import { breadcrumb, jsonLdProps } from "@/lib/seo";

export const metadata: Metadata = {
  title: `ZESA Units per Amount — What Your ZiG (ZWG) or USD Buys (${TARIFFS.effectiveDate})`,
  description: `How many ZESA units (kWh) you get for ZiG (ZWG) 50 to 5,000 and US$1 to US$100, what 50 to 400 units cost, and the effective price per kWh for each — at the ZERA-approved ZETDC tariffs effective ${TARIFFS.effectiveDate}, incl. the 6% REA levy. Updated daily.`,
  alternates: { canonical: "/units/" },
};

const faqs = [
  {
    q: "Why does the same amount buy fewer units later in the month?",
    a: `ZESA's tariff is stepped: the first 50 units of each calendar month are the cheapest and every band above that costs more. The figures on this page are all first purchases of the month, starting from the cheapest band. Once you have used your cheap bands, the same money lands in higher bands and buys fewer units — the calculator on the home page takes "units already bought" into account.`,
  },
  {
    q: "What is the cheapest way to buy ZESA units?",
    a: `Buy inside your ${MONTHLY_QUOTA} kWh monthly quota. Every unit above the quota in the same calendar month is charged at the top band rate, so a household that needs more than ${MONTHLY_QUOTA} kWh pays noticeably less by topping up before the month ends and buying the rest after the 1st, when the quota resets.`,
  },
  {
    q: "Are USD figures the price ZETDC charges?",
    a: `No. ZETDC bills in ZWG. USD amounts on this site are converted at the reference rate published with the tariff schedule — currently about ${fmt(RATE, 1)} ZWG per US$ — so a USD payment channel may convert at a slightly different rate on the day.`,
  },
];

export default function UnitsIndex() {
  const zwg = AMOUNT_PAGES.filter((p) => p.currency === "ZWG");
  const usd = AMOUNT_PAGES.filter((p) => p.currency === "USD");

  const jsonLd = [
    breadcrumb([["ZESA amounts", "/units/"]]),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  /** Money → units, with the effective price per kWh that band-stepping produces. */
  const amountTable = (rows: typeof AMOUNT_PAGES, heading: string, note: string) => (
    <div>
      <h2 className="font-display text-xl font-bold">{heading}</h2>
      <p className="mt-2 text-sm text-dim">{note}</p>
      <div className="scroll-hint mt-4 rounded-2xl border border-line bg-card shadow-sm">
        <div className="overflow-x-auto rounded-2xl">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-line bg-paper text-left text-xs uppercase tracking-wider text-dim">
                <th className="px-2 py-3 font-medium sm:px-4">You pay</th>
                <th className="px-2 py-3 text-right font-medium sm:px-4">You get</th>
                <th className="hidden whitespace-nowrap px-2 py-3 text-right font-medium sm:table-cell sm:px-4">ZWG / kWh</th>
                <th className="whitespace-nowrap px-2 py-3 text-right font-medium sm:px-4">Lasts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.slug} className="border-b border-line/60 last:border-0">
                  <td className="px-2 py-3 font-medium sm:px-4">
                    <Link href={`/units/${p.slug}/`} className="underline decoration-line hover:text-volt-deep">
                      {p.display}
                    </Link>
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums sm:px-4">{fmt(p.units, 1)} kWh</td>
                  <td className="hidden px-2 py-3 text-right tabular-nums text-dim sm:table-cell sm:px-4">
                    {p.units > 0 ? fmt(p.amountZwg / p.units, 3) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums text-dim sm:px-4">
                    {formatDuration(daysOfQuotaUse(p.units) * 24)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdProps(...jsonLd)} />
      <section className="border-b border-line bg-ink text-white">
        <div className="container-page py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-volt">
            ZETDC tariffs effective {TARIFFS.effectiveDate} · verified {TARIFFS.lastVerified}
          </p>
          <h1 className="font-display mt-3 text-3xl font-bold sm:text-4xl">
            What your money buys<span aria-hidden className="text-volt">.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-white/70">
            Every common ZESA purchase worked out both ways — money to units and units to money —
            with the effective price per kWh, because band-stepping means no two purchases cost the
            same per unit. First purchase of the month, 6% REA levy included, regenerated whenever
            ZERA changes the rates. USD amounts use the published reference rate of ≈ {fmt(RATE, 1)}{" "}
            ZWG per US$.
          </p>
          <p className="mt-4 text-sm">
            <Link href="/zesa-tariffs/" className="underline hover:text-volt">
              The six bands these figures come from →
            </Link>
          </p>
        </div>
      </section>

      <section className="container-page mt-10 grid gap-10 lg:grid-cols-2">
        {amountTable(
          zwg,
          "In ZWG",
          "The notes people actually buy. “Lasts” assumes a household that would otherwise use its full 400 kWh quota in a month.",
        )}
        {amountTable(
          usd,
          "In US dollars",
          `Converted at ≈ ${fmt(RATE, 1)} ZWG per US$ — the reference rate published with the tariff schedule.`,
        )}
      </section>

      <section className="container-page mt-12">
        <h2 className="font-display text-xl font-bold">Cost of a given number of units</h2>
        <p className="mt-2 max-w-2xl text-sm text-dim">
          Working the other way — what a fixed number of units costs as a first purchase of the
          month, and what that many units runs in the house.
        </p>
        <div className="scroll-hint mt-4 rounded-2xl border border-line bg-card shadow-sm">
          <div className="overflow-x-auto rounded-2xl">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-line bg-paper text-left text-xs uppercase tracking-wider text-dim">
                  <th className="px-2 py-3 font-medium sm:px-4">Units</th>
                  <th className="px-2 py-3 text-right font-medium sm:px-4">Cost (ZWG)</th>
                  <th className="whitespace-nowrap px-2 py-3 text-right font-medium sm:px-4">≈ USD</th>
                  <th className="hidden whitespace-nowrap px-2 py-3 text-right font-medium sm:table-cell sm:px-4">ZWG / kWh</th>
                  <th className="whitespace-nowrap px-2 py-3 text-right font-medium sm:px-4">% of quota</th>
                </tr>
              </thead>
              <tbody>
                {UNIT_PAGES.map((u) => (
                  <tr key={u.slug} className="border-b border-line/60 last:border-0">
                    <td className="px-2 py-3 font-medium sm:px-4">
                      <Link href={`/units/${u.slug}/`} className="underline decoration-line hover:text-volt-deep">
                        {u.display}
                      </Link>
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums sm:px-4">{fmt(u.costZwg)}</td>
                    <td className="px-2 py-3 text-right tabular-nums text-dim sm:px-4">${fmt(u.costUsd)}</td>
                    <td className="hidden px-2 py-3 text-right tabular-nums text-dim sm:table-cell sm:px-4">
                      {fmt(u.costZwg / u.units, 3)}
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums text-dim sm:px-4">
                      {fmt((u.units / MONTHLY_QUOTA) * 100, 0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="container-page mt-12 max-w-3xl">
        <h2 className="font-display text-xl font-bold">Questions people ask about ZESA units</h2>
        <dl className="mt-4 divide-y divide-line rounded-2xl border border-line bg-card">
          {faqs.map((f) => (
            <div key={f.q} className="p-5">
              <dt className="font-display font-semibold">{f.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-dim">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="container-page mt-10 mb-4">
        <p className="text-sm text-dim">
          Need a different number, or already bought units this month?{" "}
          <Link href="/" className="underline hover:text-volt-deep">
            Use the calculator
          </Link>
          . Ready to top up?{" "}
          <Link href="/buy/" className="underline hover:text-volt-deep">
            Buy a token
          </Link>
          . Curious how the rates got here?{" "}
          <Link href="/zesa-tariffs/history/" className="underline hover:text-volt-deep">
            Tariff history
          </Link>
          .
        </p>
      </section>
    </>
  );
}
