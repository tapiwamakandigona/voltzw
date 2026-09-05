import type { Metadata } from "next";
import Link from "next/link";
import BuyFlow from "@/components/BuyFlow";
import { BuyPitch, PayStep } from "@/components/BuyPitch";
import { AMOUNT_PAGES } from "@/lib/amounts";
import { TARIFFS, MONTHLY_QUOTA, fmt } from "@/lib/tariff";
import { breadcrumb, jsonLdProps } from "@/lib/seo";

export const metadata: Metadata = {
  title: "ZESA Token Purchases — Check Your Meter & Payment Availability",
  description:
    "Check your ZETDC prepaid meter and current purchase availability. See supported payment methods and service fees before paying, or request a launch update while payments are closed.",
  alternates: { canonical: "/buy/" },
};

/** Static, indexable substance for a page whose interactive half is
 *  client-rendered: Search Console had /buy/ as "Discovered – currently not
 *  indexed" with nothing crawled, because the form is all JavaScript and the
 *  copy around it was three step-cards. These answers are the ones asked
 *  before a first prepaid purchase, and every one of them is true regardless
 *  of whether payments are open yet. */
const faqs = [
  {
    q: "Are token purchases currently open?",
    a: "The form above checks the current payment configuration. If payments are closed or unavailable, do not send money: you can request a launch update instead. No launch date is promised. The calculator, tariff tables and retrieval guides remain free.",
  },
  {
    q: "What do I need to buy a ZESA token online?",
    a: "Your 11-digit ZETDC prepaid meter number and a phone number for the token SMS. The meter number is printed on the meter itself and on any previous token receipt — it is not your ZETDC account number. We check the registered name on the meter before any payment so a mistyped digit cannot send your token to a stranger.",
  },
  {
    q: "How is the token delivered?",
    a: "When purchases are open and a purchase succeeds, the 20-digit token appears on screen and is sent by SMS to the number you enter. Delivery depends on payment confirmation and the vending service; do not pay again while an order is pending. Purchase history lets you retrieve the same token if an SMS is lost.",
  },
  {
    q: "Does buying online cost more than buying at a shop?",
    a: `The electricity itself is priced by ZETDC's ZERA-approved stepped tariff, identical in every channel — currently effective ${TARIFFS.effectiveDate}. Any service fee is shown before you confirm, so the amount you pay and the token value are both on screen before money moves.`,
  },
  {
    q: "How many units will my payment give me?",
    a: `That depends on how much you have already bought this calendar month, because the first ${MONTHLY_QUOTA} kWh each month is charged in six stepped bands. The calculator works it out exactly, and the amount pages show the answer for every common purchase.`,
  },
  {
    q: "Can I buy a token for someone else's meter?",
    a: "When purchases are open, yes. Enter their meter number, confirm the registered name we show back to you, and put your own phone number in for the SMS if you want the token yourself. Prepaid tokens are tied to the meter, not to the buyer.",
  },
];

export default function BuyPage() {
  const jsonLd = [
    breadcrumb([["Buy ZESA tokens", "/buy/"]]),
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
  const popular = AMOUNT_PAGES.filter((p) =>
    ["zwg-200", "zwg-500", "zwg-1000", "zwg-2000", "usd-5", "usd-10", "usd-20"].includes(p.slug),
  );
  return (
    <div className="container-page py-10 sm:py-14">
      {/* Desktop: the three step-cards sit beside the form instead of
          leaving dead whitespace either side of a lone centered column. */}
      <div className="mx-auto max-w-xl lg:grid lg:max-w-4xl lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start lg:gap-12">
        <div>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Buy ZESA tokens<span className="text-volt-deep">.</span>
        </h1>
        <BuyPitch />
        <div className="mt-8">
          <BuyFlow />
        </div>
        </div>
        <div className="mt-10 grid gap-4 text-sm md:grid-cols-3 lg:mt-0 lg:grid-cols-1">
          <div className="rounded-lg border border-line bg-card p-4">
            <p className="font-display font-semibold">1. Verify</p>
            <p className="mt-1 text-dim">We confirm the registered name on your meter before you pay.</p>
          </div>
          <div className="rounded-lg border border-line bg-card p-4">
            <p className="font-display font-semibold">2. Pay securely</p>
            <PayStep />
          </div>
          <div className="rounded-lg border border-line bg-card p-4">
            <p className="font-display font-semibold">3. Get your token</p>
            <p className="mt-1 text-dim">After a successful purchase, shown on screen and sent by SMS. Check the order status if delivery is pending.</p>
          </div>
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdProps(...jsonLd)} />

      <section className="mx-auto mt-14 max-w-3xl">
        <h2 className="font-display text-2xl font-bold">Before you buy</h2>
        <dl className="mt-4 divide-y divide-line rounded-2xl border border-line bg-card">
          {faqs.map((f) => (
            <div key={f.q} className="p-5">
              <dt className="font-display font-semibold">{f.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-dim">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto mt-10 max-w-3xl">
        <h2 className="font-display text-xl font-bold">Know what you are buying</h2>
        <p className="mt-2 text-sm text-dim">
          Today&apos;s answer for the amounts people top up with, at the ZERA-approved rates
          effective {TARIFFS.effectiveDate}:
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {popular.map((p) => (
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
        <p className="mt-4 text-sm text-dim">
          <Link href="/units/" className="underline hover:text-volt-deep">
            Every amount in one table
          </Link>{" "}
          ·{" "}
          <Link href="/zesa-tariffs/" className="underline hover:text-volt-deep">
            The six tariff bands
          </Link>{" "}
          ·{" "}
          <Link href="/retrieve-zesa-token/" className="underline hover:text-volt-deep">
            Token didn&apos;t arrive?
          </Link>
        </p>
      </section>
    </div>
  );
}
