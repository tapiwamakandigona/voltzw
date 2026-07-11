import type { Metadata } from "next";
import Link from "next/link";
import Calculator from "@/components/Calculator";
import { TARIFFS, MONTHLY_QUOTA, TARIFF_MONTH_LABEL, remainingQuota, zwgToUsd, fmt } from "@/lib/tariff";

export const metadata: Metadata = {
  title: `ZESA Calculator — ${TARIFF_MONTH_LABEL} ZETDC Tariffs, Money to Units (Free)`,
  description: `Free ZESA token calculator for Zimbabwe, updated for the ${TARIFF_MONTH_LABEL} ZETDC tariffs. See exactly how many units (kWh) your money buys — all six stepped bands, the 6% REA levy and your 400 kWh monthly quota included.`,
  alternates: { canonical: "/" },
};

// Cost of the full monthly quota, computed at build time from the same
// tariffs.json the calculator uses — the daily tariff sync can never make
// this copy (or the FAQPage JSON-LD below) go stale again.
const fullQuotaZwg = remainingQuota(0).costZwg;
const quotaCostZwg = fmt(fullQuotaZwg);
const quotaCostUsd = fmt(zwgToUsd(fullQuotaZwg));

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
            See exactly how many units your money buys — band by band, including the 6% REA levy and your
            400 kWh monthly quota. Updated whenever ZERA changes the rates.
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
            desc: "Pay with EcoCash in USD or ZWG and get your token on screen and by SMS — no account needed.",
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

      <section id="buy" className="container-page mt-16">
        <div className="rounded-2xl bg-ink p-6 text-white sm:p-10">
          <h2 className="font-display text-2xl font-bold">Buy ZESA tokens on VoltZW — <span className="text-volt">live now</span></h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-white/70">
            Pay with EcoCash and other Paynow methods, in <strong className="text-white">USD or ZWG</strong>. We verify your
            meter first, then your 20-digit token appears on screen and is sent by SMS. Every purchase stays attached to
            your meter number — a lost SMS never means a lost token. Perfect for topping up a family meter from the diaspora.
          </p>
          <Link
            href="/buy/"
            className="mt-5 inline-block rounded-lg bg-volt px-6 py-3 font-semibold text-ink transition hover:bg-volt/80"
          >
            Buy tokens now →
          </Link>
        </div>
      </section>

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
