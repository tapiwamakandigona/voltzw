import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = pageMeta(
  "ZESA Token Not Received? Retrieve or View It — EcoCash, ZB, CBZ & All Banks",
  "Your token is not lost — it is stored where you bought it. Retrieve or view a ZESA token in minutes: EcoCash (*151#), ZB, CBZ, Steward and other bank apps, the ZETDC self-service portal, WhatsApp and in-person options.",
  "/retrieve-zesa-token/",
);

/** The exact questions people type into Google ("zesa token not received",
 *  "how to retrieve zesa token on zb bank") — answered visibly on the page
 *  and marked up as FAQPage so the answers are snippet-eligible. */
const faq = [
  {
    q: "Why was my ZESA token not received by SMS?",
    a: "The most common causes are SMS delays on the mobile network, buying with a different phone number than the one registered to the meter, or a temporary ZETDC vending outage. The token itself is almost never lost — it is stored by the channel you bought from (EcoCash, your bank, or the vendor), so you can retrieve it from there instead of waiting for the SMS.",
  },
  {
    q: "How do I retrieve a ZESA token bought with EcoCash?",
    a: "Dial *151#, go to Make Payment and check your Pay Bill history, or look through your EcoCash SMS statement — the token is in the transaction record. You can also call Econet on 114 and ask for the token to be resent.",
  },
  {
    q: "How do I retrieve a ZESA token on ZB, CBZ, Steward or another bank?",
    a: "Reopen your bank app's ZESA or bill-payments section and open the transaction details — the token is usually stored with the transaction. For USSD purchases, check the confirmation SMS thread. If you cannot find it, contact the bank's support line with your transaction reference number.",
  },
  {
    q: "Can I view my old ZESA tokens online?",
    a: "Yes. Register on the ZETDC self-service portal at selfservice.zetdc.co.zw using your meter number and any past token, and you can view your full token purchase history whenever an SMS goes missing.",
  },
  {
    q: "The token says 'used' or the meter rejects it — what now?",
    a: "Check that the token was generated for your exact meter number: a common cause is buying against the wrong meter. If the meter number is right, take the token, your meter number and proof of payment to a ZETDC banking hall, or call the ZETDC national call centre — they can verify and reissue it.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to retrieve a lost ZESA token",
  description: "Recover a ZESA prepaid electricity token that never arrived by SMS, using the channel you bought from.",
  step: [
    { "@type": "HowToStep", name: "Identify where you bought", text: "Token retrieval always goes through the channel you purchased from: EcoCash, your bank, an online vendor, or ZETDC directly." },
    { "@type": "HowToStep", name: "EcoCash", text: "Dial *151# , go to Make Payment → Pay Bill history, or check your EcoCash SMS statement. You can also call Econet on 114 to have the token resent." },
    { "@type": "HowToStep", name: "Bank purchases (ZB, CBZ, Steward, FBC, NMB and others)", text: "Reopen the bank app's ZESA/bill payments section and view the transaction details — the token is usually stored there. Otherwise contact the bank's support line with your reference number." },
    { "@type": "HowToStep", name: "ZETDC self-service portal", text: "Register at selfservice.zetdc.co.zw with your meter number and a past token, then view your token history." },
    { "@type": "HowToStep", name: "In person", text: "Visit a ZETDC banking hall or service centre with your meter number and proof of payment." },
  ],
};

const methods = [
  {
    title: "Bought with EcoCash?",
    id: "ecocash",
    steps: [
      <>Dial <strong>*151#</strong> and go to <strong>Make Payment → Pay Bill</strong> — the biller code for ZESA prepaid is <strong>04336</strong>. Your recent bill payments (with tokens) are in the transaction history.</>,
      <>Check your SMS inbox for the original EcoCash confirmation — the 20-digit token is in the message. Search your messages for &ldquo;ZETDC&rdquo; or &ldquo;token&rdquo;.</>,
      <>Still nothing? Call Econet customer care on <strong>114</strong> with the transaction reference and ask for the token to be resent.</>,
    ],
  },
  {
    title: "Bought through a bank app or USSD?",
    id: "bank",
    steps: [
      <>Open the app&apos;s <strong>bill payments / ZESA</strong> section and tap the transaction — most banks (ZB, CBZ, Steward, FBC, NMB, etc.) store the token in the transaction details.</>,
      <>If the app shows no token, contact the bank&apos;s support with your <strong>transaction reference number</strong> — they can re-issue it. The purchase went through their vending partner, so ZETDC will redirect you back to the bank anyway.</>,
    ],
  },
  {
    title: "Bought from an online vendor?",
    id: "online",
    steps: [
      <>Go back to the website or WhatsApp line you bought from — reputable vendors keep a <strong>token history per meter number</strong> you can look up without an account.</>,
      <>Check your email (including spam) — many vendors email the token as well as SMS it.</>,
    ],
  },
  {
    title: "The ZETDC self-service portal",
    id: "zetdc",
    steps: [
      <>Visit <strong>selfservice.zetdc.co.zw</strong> and register with your meter number. Note: registration asks for details of a <strong>previous token purchase</strong>, so keep any old token handy — this is the portal&apos;s biggest catch.</>,
      <>Once registered, use <strong>View Token</strong> to see tokens issued to your meter, including ones that never arrived by SMS.</>,
      <>ZETDC also runs official WhatsApp fault-report lines and the national call centre (<strong>0242 704 245-9</strong>) — useful when the whole vending system is down.</>,
    ],
  },
  {
    title: "Last resort: in person",
    id: "in-person",
    steps: [
      <>Take your <strong>meter number and proof of payment</strong> to the nearest ZETDC banking hall or service centre. During system outages this is often the only channel that still works.</>,
    ],
  },
];

export default function RetrievePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([howToJsonLd, faqJsonLd]) }} />
      <section className="border-b border-line bg-ink text-white">
        <div className="container-page py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-volt">Token not showing? Start here</p>
          <h1 className="font-display mt-3 text-4xl font-bold">How to retrieve a lost ZESA token<span aria-hidden className="text-volt">.</span></h1>
          <p className="mt-3 max-w-2xl text-white/70">
            The golden rule: <strong className="text-white">retrieval goes through the channel you bought from.</strong>{" "}
            Find your purchase method below and follow the steps.
          </p>
        </div>
      </section>

      {/* Jump-to-channel chips — the guide is long; get people to their
          purchase channel in one tap. */}
      <nav aria-label="Jump to your channel" className="container-page mt-6 max-w-3xl">
        <ul className="flex flex-wrap gap-2">
          {[
            { href: "#ecocash", label: "EcoCash" },
            { href: "#bank", label: "Bank app / USSD" },
            { href: "#online", label: "Online vendor" },
            { href: "#zetdc", label: "ZETDC portal" },
            { href: "#in-person", label: "In person" },
            { href: "#buy-on-voltzw", label: "Never lose one again" },
          ].map((c) => (
            <li key={c.href}>
              <a
                href={c.href}
                className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-4 text-sm font-medium transition hover:border-volt-deep hover:text-volt-deep"
              >
                {c.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section className="container-page mt-8 max-w-3xl space-y-8">
        {methods.map((m) => (
          <div key={m.id} id={m.id} className="scroll-mt-20 rounded-2xl border border-line bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-bold">{m.title}</h2>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed text-dim">
              {m.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-volt font-mono text-xs font-bold text-ink">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}

        <div className="pt-2">
          <h2 className="font-display text-2xl font-bold">Token not received? Quick answers</h2>
          <div className="mt-4 space-y-4">
            {faq.map((f) => (
              <details key={f.q} className="rounded-2xl border border-line bg-card p-5 shadow-sm">
                <summary className="cursor-pointer font-semibold">{f.q}</summary>
                <p className="mt-3 text-sm leading-relaxed text-dim">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        <div id="buy-on-voltzw" className="scroll-mt-20 rounded-2xl border border-line bg-ink p-6 text-white sm:p-8">
          <h2 className="font-display text-xl font-bold">Never lose a token again</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            Buy your tokens on VoltZW and they are delivered <strong className="text-white">on screen and by SMS</strong> —
            and every purchase stays attached to your meter number, so you can always look it up. No account needed.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/buy/"
              className="rounded-lg bg-volt px-5 py-3 text-sm font-semibold text-ink transition hover:bg-volt/80"
            >
              Buy tokens now
            </Link>
            <Link href="/" className="rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold transition hover:border-volt hover:text-volt">
              Try the calculator
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
