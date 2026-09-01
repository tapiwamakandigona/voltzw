import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import Calculator from "@/components/Calculator";
import BuyPromo from "@/components/BuyPromo";
import { AMOUNT_PAGES, UNIT_PAGES } from "@/lib/amounts";
import { FIRST_DATE, HISTORY, totalDriftPct } from "@/lib/history";
import { TARIFFS, MONTHLY_QUOTA, remainingQuota, zwgToUsd, fmt } from "@/lib/tariff";

export const metadata: Metadata = pageMeta(
  `ZESA Calculator Zimbabwe — ZiG (ZWG) & USD to Units, ZETDC Tariffs ${TARIFFS.effectiveDate}`,
  `Free ZESA token calculator for Zimbabwe (ZETDC) in ZiG (ZWG) or US dollars, on the ZERA-approved tariffs effective ${TARIFFS.effectiveDate} — verified daily, not monthly. See exactly how many units (kWh) your money buys: all six stepped bands, the 6% REA levy and your 400 kWh quota.`,
  "/",
);

// Cost of the full monthly quota, computed at build time from the same
// tariffs.json the calculator uses — the daily tariff sync can never make
// this copy (or the FAQPage JSON-LD below) go stale again.
const fullQuotaZwg = remainingQuota(0).costZwg;
const quotaCostZwg = fmt(fullQuotaZwg);
const quotaCostUsd = fmt(zwgToUsd(fullQuotaZwg));

// The amounts that carry the "how many units is X" queries.
const POPULAR = AMOUNT_PAGES.filter((p) =>
  ["zwg-100", "zwg-200", "zwg-500", "zwg-1000", "zwg-2000", "usd-2", "usd-5", "usd-10", "usd-20"].includes(p.slug),
);

const faqs = [
  {
    q: "How many units do I get for my money?",
    a: "It depends on how much you have already bought this month. ZESA uses a stepped tariff: the first 50 units each month are cheapest, and each band after that costs more. Our calculator applies the exact ZERA-approved band prices, including the 6% REA levy, and accounts for units you have already purchased.",
  },
  {
    q: "Is ZESA cheaper at the beginning of the month?",
    a: "Not exactly — prices don't change with the date. What resets on the 1st is your 400 kWh discounted monthly quota. If you already used your cheap bands this month, new purchases fall into expensive bands. Buying early in the month simply means you are starting from the cheapest band again.",
  },
  {
    q: "What is the 400 kWh monthly quota?",
    a: `Every prepaid meter gets ${MONTHLY_QUOTA} kWh per calendar month at discounted stepped rates — ZWG ${quotaCostZwg} (about US$${quotaCostUsd}) buys the full quota at current rates. Every unit above ${MONTHLY_QUOTA} kWh in the same month is charged at the top rate. The quota resets on the 1st of each month.`,
  },
  {
    q: "How do I check my ZESA balance online?",
    a: "Your remaining units live on the meter itself — press 07 on most prepaid meters to display the balance. To see your purchase history and past tokens, use the ZETDC self-service portal, or the channel you bought from (EcoCash, your bank, or an online vendor).",
  },
  {
    q: "Is ZiG the same as ZWG?",
    a: "Yes. ZiG (Zimbabwe Gold) is the currency's name and ZWG is its official code — they are the same money. ZETDC bills prepaid electricity in ZiG, so the ZiG figures here are exact; USD figures are estimates at the reference rate published with the tariffs.",
  },
  {
    q: "What are the ZESA tariffs in USD?",
    a: `ZETDC prices are set in ZiG, but converted at the reference rate the ${TARIFFS.effectiveDate} schedule works out to roughly US$${TARIFFS.bands[0].usdApprox.toFixed(2)} per unit for the first 50 units, rising band by band to about US$${TARIFFS.bands[TARIFFS.bands.length - 1].usdApprox.toFixed(2)} per unit above 400 kWh. The full table in both currencies is on our tariffs page.`,
  },
  {
    q: "Can I buy ZESA tokens on VoltZW?",
    a: "Yes — buy tokens right here with EcoCash and other Paynow methods, in USD or ZWG. Verify your meter, pay, and your 20-digit token appears on screen and is sent by SMS. Your purchase history stays attached to your meter number, so a lost SMS never means a lost token.",
  },
];

export default function Home() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "VoltZW ZESA Calculator",
    url: "https://zesa.tapiwa.me/",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: "Free ZESA electricity calculator with current ZETDC stepped tariffs for Zimbabwe.",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />

      <section className="border-b border-line bg-ink text-white">
        <div className="container-page py-12 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-volt">Free · No login · Live tariffs</p>
          <h1 className="font-display mt-3 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
            ZESA calculator with the{" "}
            {/* Art-directed break: the yellow phrase gets its own line on
                desktop instead of wrapping mid-phrase. */}
            <br className="hidden lg:block" />
            <span className="text-volt">real stepped tariffs<span aria-hidden>.</span></span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/70">
            See exactly how many units your ZiG (ZWG) or US dollars buy — band by band, including the
            6% REA levy and your 400 kWh monthly quota. Updated whenever ZERA changes the rates.
          </p>
        </div>
      </section>

      <section className="container-page -mt-6 pb-4 sm:-mt-8">
        <Calculator />
      </section>

      <section className="container-page mt-14 grid gap-6 md:grid-cols-3">
        {[
          {
            href: "/zesa-tariffs/",
            title: "Current ZESA tariffs",
            desc: `All six bands at ZERA-approved rates, effective ${TARIFFS.effectiveDate}. Understand the quota before you buy.`,
            cta: "See the tariffs",
          },
          {
            href: "/retrieve-zesa-token/",
            title: "Token didn't arrive?",
            desc: "The complete guide to retrieving a lost ZESA token — EcoCash, banks, the ZETDC portal and WhatsApp lines.",
            cta: "Retrieve your token",
          },
          {
            href: "/buy/",
            title: "Buy tokens online",
            desc: "Verify any ZETDC meter, then pay with EcoCash in USD or ZWG — token on screen and by SMS, no account needed.",
            cta: "Buy now",
          },
        ].map((c) => (
          <Link key={c.title} href={c.href} className="group rounded-2xl border border-line bg-card p-6 shadow-sm transition hover:border-volt-deep">
            <h2 className="font-display text-lg font-bold">{c.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-dim">{c.desc}</p>
            <p className="mt-4 text-sm font-semibold text-volt-deep group-hover:underline">{c.cta} →</p>
          </Link>
        ))}
      </section>

      <section className="container-page mt-14">
        <h2 className="font-display text-2xl font-bold">Common amounts, worked out</h2>
        <p className="mt-2 max-w-2xl text-dim">
          Today&apos;s answer for the amounts people actually buy — recalculated every time ZERA
          changes the rates.
        </p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {POPULAR.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/units/${p.slug}/`}
                className="inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 text-sm hover:border-volt"
              >
                <span className="font-medium">{p.display}</span>
                <span className="ml-2 tabular-nums text-dim">{fmt(p.units, 1)} kWh</span>
              </Link>
            </li>
          ))}
        </ul>
        <h3 className="font-display mt-8 text-lg font-bold">Or start from the units</h3>
        <p className="mt-2 max-w-2xl text-sm text-dim">
          What a fixed number of units costs today — and what each one actually runs in the house.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {UNIT_PAGES.map((u) => (
            <li key={u.slug}>
              <Link
                href={`/units/${u.slug}/`}
                className="inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-3 text-sm hover:border-volt"
              >
                <span className="font-medium">{u.display}</span>
                <span className="ml-2 tabular-nums text-dim">ZWG {fmt(u.costZwg)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-dim">
          <Link href="/units/" className="font-medium underline hover:text-volt-deep">
            See every amount and unit count in one table
          </Link>{" "}
          — ZWG 50 to ZWG 5,000, US$1 to US$100, and 50 to 400 units, with the effective price per
          kWh for each.
        </p>

        <p className="mt-5 text-sm text-dim">
          ZESA prices move with the ZWG — the entry band has shifted{" "}
          {totalDriftPct() >= 0 ? "+" : ""}{fmt(totalDriftPct(), 1)}% across {HISTORY.length}{" "}
          schedules since {FIRST_DATE}.{" "}
          <Link href="/zesa-tariffs/history/" className="underline hover:text-volt-deep">
            See the full tariff history
          </Link>{" "}
          — free as JSON and CSV.
        </p>
      </section>

      <BuyPromo />

      <section className="container-page mt-16 max-w-3xl">
        <h2 className="font-display text-2xl font-bold">ZESA calculator — frequently asked questions</h2>
        <div className="mt-6 space-y-6">
          {faqs.map((f) => (
            <div key={f.q} className="border-b border-line pb-6">
              <h3 className="font-semibold">{f.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-dim">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
