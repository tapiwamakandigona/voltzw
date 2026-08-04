import type { Metadata } from "next";
import Link from "next/link";
import { AMOUNT_PAGES, UNIT_PAGES } from "@/lib/amounts";
import { TARIFFS, RATE, fmt } from "@/lib/tariff";
import { breadcrumb, jsonLdProps } from "@/lib/seo";

export const metadata: Metadata = {
  title: `ZESA Units per Amount — What Your Money Buys in Zimbabwe (${TARIFFS.effectiveDate})`,
  description: `How many ZESA units (kWh) you get for ZWG 50 to ZWG 5,000 and US$1 to US$100, at the ZERA-approved ZETDC tariffs effective ${TARIFFS.effectiveDate}. Includes the 6% REA levy, updated daily.`,
  alternates: { canonical: "/units/" },
};

export default function UnitsIndex() {
  const zwg = AMOUNT_PAGES.filter((p) => p.currency === "ZWG");
  const usd = AMOUNT_PAGES.filter((p) => p.currency === "USD");

  const table = (rows: typeof AMOUNT_PAGES, heading: string) => (
    <div>
      <h2 className="font-display text-xl font-bold">{heading}</h2>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {rows.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/units/${p.slug}/`}
              className="flex min-h-11 items-center justify-between rounded-lg border border-line bg-card px-4 text-sm hover:border-volt"
            >
              <span className="font-medium">{p.display}</span>
              <span className="tabular-nums text-dim">{fmt(p.units, 1)} kWh</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdProps(breadcrumb([["ZESA amounts", "/units/"]]))}
      />
      <section className="border-b border-line bg-ink text-white">
        <div className="container-page py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-volt">
            ZETDC tariffs effective {TARIFFS.effectiveDate}
          </p>
          <h1 className="font-display mt-3 text-3xl font-bold sm:text-4xl">
            What your money buys<span aria-hidden className="text-volt">.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-white/70">
            Every figure is a first purchase of the month, includes the 6% REA levy, and is
            regenerated whenever ZERA changes the rates. USD amounts use the published reference
            rate of ≈ {fmt(RATE, 1)} ZWG per US$.
          </p>
        </div>
      </section>

      <section className="container-page mt-10 grid gap-10 sm:grid-cols-2">
        {table(zwg, "In ZWG")}
        {table(usd, "In US dollars")}
      </section>

      <section className="container-page mt-10">
        <h2 className="font-display text-xl font-bold">Cost of a given number of units</h2>
        <p className="mt-2 max-w-2xl text-sm text-dim">
          Working the other way — what a fixed number of units costs as a first purchase of the
          month.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {UNIT_PAGES.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/units/${p.slug}/`}
                className="flex min-h-11 items-center justify-between rounded-lg border border-line bg-card px-4 text-sm hover:border-volt"
              >
                <span className="font-medium">{p.display}</span>
                <span className="tabular-nums text-dim">ZWG {fmt(p.costZwg)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page mt-10">
        <p className="text-sm text-dim">
          Need a different number, or already bought units this month?{" "}
          <Link href="/" className="underline hover:text-volt-deep">
            Use the calculator
          </Link>
          .
        </p>
      </section>
    </>
  );
}
