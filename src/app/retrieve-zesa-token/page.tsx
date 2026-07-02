import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How to Retrieve a Lost ZESA Token — Every Method That Works",
  description:
    "ZESA token not showing? Step-by-step guide to retrieve a lost prepaid electricity token: EcoCash, bank apps, the ZETDC self-service portal, WhatsApp and in-person options.",
  alternates: { canonical: "/retrieve-zesa-token/" },
};

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to retrieve a lost ZESA token",
  description: "Recover a ZESA prepaid electricity token that never arrived by SMS, using the channel you bought from.",
  step: [
    { "@type": "HowToStep", name: "Identify where you bought", text: "Token retrieval always goes through the channel you purchased from: EcoCash, your bank, an online vendor, or ZETDC directly." },
    { "@type": "HowToStep", name: "EcoCash", text: "Dial *151# , go to Make Payment → Pay Bill history, or check your EcoCash SMS statement. You can also call Econet on 114 to have the token resent." },
    { "@type": "HowToStep", name: "Bank purchases", text: "Reopen the bank app's ZESA/bill payments section and view transaction details — the token is usually stored there. Otherwise contact the bank's support line with your reference number." },
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
      <>Open the app&apos;s <strong>bill payments / ZESA</strong> section and tap the transaction — most banks (CBZ, Steward, FBC, NMB, etc.) store the token in the transaction details.</>,
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <section className="border-b border-line bg-ink text-white">
        <div className="container-page py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-volt">Token not showing? Start here</p>
          <h1 className="font-display mt-3 text-4xl font-bold">How to retrieve a lost ZESA token</h1>
          <p className="mt-3 max-w-2xl text-white/70">
            The golden rule: <strong className="text-white">retrieval goes through the channel you bought from.</strong>{" "}
            Find your purchase method below and follow the steps.
          </p>
        </div>
      </section>

      <section className="container-page mt-10 max-w-3xl space-y-8">
        {methods.map((m) => (
          <div key={m.id} id={m.id} className="rounded-2xl border border-line bg-card p-6 shadow-sm">
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

        <div className="rounded-2xl border border-line bg-ink p-6 text-white sm:p-8">
          <h2 className="font-display text-xl font-bold">Never lose a token again</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            VoltZW will soon sell tokens with delivery <strong className="text-white">on screen, by WhatsApp and by SMS</strong> —
            and every purchase stays attached to your meter number, so you can always look it up. No account needed.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="mailto:silentics.org@gmail.com?subject=VoltZW%20early%20access"
              className="rounded-lg bg-volt px-5 py-3 text-sm font-semibold text-ink transition hover:bg-volt-deep hover:text-white"
            >
              Get early access
            </a>
            <Link href="/" className="rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold transition hover:border-volt hover:text-volt">
              Try the calculator
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
