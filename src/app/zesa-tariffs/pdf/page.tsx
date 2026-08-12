import type { Metadata } from "next";
import Link from "next/link";
import { TARIFFS, BANDS, fmt } from "@/lib/tariff";
import { monthLabel } from "@/lib/history";
import { breadcrumb, jsonLdProps, SITE } from "@/lib/seo";

export const dynamic = "force-static";

const CURRENT_MONTH = TARIFFS.lastVerified.slice(0, 7);
const CURRENT_MONTH_LABEL = monthLabel(CURRENT_MONTH);

export const metadata: Metadata = {
  title: `ZESA Tariffs PDF Download ${CURRENT_MONTH_LABEL} — Free ZETDC Rates Table in ZiG & USD`,
  description: `Download the current ZESA (ZETDC) tariffs as a free PDF: all six ZERA-approved stepped bands for ${CURRENT_MONTH_LABEL} in ZiG (ZWG) and USD, including the 6% REA levy. Regenerated automatically every day, so the PDF is never stale.`,
  alternates: { canonical: "/zesa-tariffs/pdf/" },
};

const faq = [
  {
    q: "Is the ZESA tariffs PDF free to download?",
    a: "Yes. The PDF is completely free, with no sign-up, no email and no watermark. It contains the full ZERA-approved ZETDC stepped tariff table in ZiG (ZWG) and USD, including the 6% REA levy.",
  },
  {
    q: `Is this PDF up to date for ${CURRENT_MONTH_LABEL}?`,
    a: `Yes. The PDF is regenerated automatically from tariff data that is re-checked against the published ZERA-approved schedule every day. The copy you download today was rebuilt with data verified on ${TARIFFS.lastVerified}.`,
  },
  {
    q: "What is inside the ZESA tariffs PDF?",
    a: "All six monthly consumption bands with the price per unit (kWh) in ZWG, both with and without the 6% Rural Electrification (REA) levy, the approximate USD rate per band, the effective date of the schedule, and the date the data was last verified.",
  },
  {
    q: "Can I share or print the PDF?",
    a: "Yes. It is A4-sized for printing and small enough to forward on WhatsApp. Sharing it as-is is encouraged — the effective and verified dates are printed on it so nobody is misled by an old copy.",
  },
];

const jsonLd = [
  breadcrumb([
    ["ZESA tariffs", "/zesa-tariffs/"],
    ["PDF download", "/zesa-tariffs/pdf/"],
  ]),
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "DigitalDocument",
    name: `ZESA (ZETDC) tariffs ${CURRENT_MONTH_LABEL} — official stepped rates table`,
    url: `${SITE}/zesa-tariffs.pdf`,
    encodingFormat: "application/pdf",
    dateModified: TARIFFS.lastVerified,
    isAccessibleForFree: true,
    inLanguage: "en-ZW",
    about: "ZERA-approved ZETDC prepaid electricity tariffs for Zimbabwe",
  },
];

export default function TariffPdfPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdProps(...jsonLd)} />

      <section className="border-b border-line bg-ink text-white">
        <div className="container-page py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-volt">
            Free download · rebuilt daily · verified {TARIFFS.lastVerified}
          </p>
          <h1 className="font-display mt-3 text-3xl font-bold sm:text-4xl">
            ZESA tariffs PDF — {CURRENT_MONTH_LABEL}
            <span aria-hidden className="text-volt">.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80">
            The full ZERA-approved ZETDC stepped tariff table in{" "}
            <strong className="text-volt">ZiG (ZWG) and USD</strong>, as one printable A4 page.
            No sign-up, no watermark — and unlike most tariff PDFs floating around WhatsApp,
            this one is regenerated <strong className="text-volt">every day</strong>, so it can
            never be months out of date.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/zesa-tariffs.pdf"
              className="rounded-lg bg-volt px-6 py-3 text-sm font-semibold text-ink transition hover:bg-volt/80"
              download={`zesa-tariffs-${CURRENT_MONTH}.pdf`}
            >
              Download the PDF (free)
            </a>
            <Link
              href="/zesa-tariffs/"
              className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold transition hover:border-volt hover:text-volt"
            >
              View the table online instead
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page mt-10 max-w-3xl">
        <h2 className="font-display text-2xl font-bold">What the PDF contains</h2>
        <ul className="mt-4 space-y-2 text-dim">
          <li className="flex gap-3">
            <span aria-hidden className="text-volt-deep">✓</span>
            All {BANDS.length} monthly consumption bands, from the first 50 units (ZWG{" "}
            {fmt(BANDS[0].inclLevyZwg, 4)}/unit incl. levy) upwards
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="text-volt-deep">✓</span>
            Prices per unit (kWh) in ZWG — with and without the 6% Rural Electrification levy
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="text-volt-deep">✓</span>
            Approximate USD price per band at the published reference rate
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="text-volt-deep">✓</span>
            The schedule&apos;s effective date ({TARIFFS.effectiveDate}) and the date the data was
            last verified, printed on the page
          </li>
        </ul>
        <p className="mt-4 text-sm text-dim">
          Prefer live numbers? The <Link href="/" className="underline hover:text-volt-deep">calculator</Link>{" "}
          applies these exact rates to any amount, and the{" "}
          <Link href="/zesa-tariffs/history/" className="underline hover:text-volt-deep">tariff history</Link>{" "}
          shows how they have moved over time.
        </p>
      </section>

      <section className="container-page mt-10 max-w-3xl pb-16">
        <h2 className="font-display text-2xl font-bold">Common questions</h2>
        <div className="mt-4 space-y-4">
          {faq.map((f) => (
            <details key={f.q} className="rounded-2xl border border-line bg-card p-5 shadow-sm">
              <summary className="cursor-pointer font-semibold">{f.q}</summary>
              <p className="mt-3 text-sm leading-relaxed text-dim">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
