import type { Metadata } from "next";
import Link from "next/link";
import { TARIFFS, BANDS, bandColor, costForUnits, fmt, zwgToUsd } from "@/lib/tariff";
import { UNIT_SLUGS } from "@/lib/amounts";
import { BulbIcon, WrenchIcon } from "@/components/icons";
import { FIRST_DATE, HISTORY, monthKeys, monthLabel, monthRange } from "@/lib/history";
import { breadcrumb, jsonLdProps, pageMeta, tariffDataset } from "@/lib/seo";

/** The month this build is describing. People search "zesa tariffs august 2026",
 *  so the month has to be in the title — a page titled only "Today" ranks for
 *  the dated query and then gets no clicks, because the snippet doesn't match
 *  what they typed. Rebuilt daily by the tariff sync, so it rolls over. */
const CURRENT_MONTH = TARIFFS.lastVerified.slice(0, 7);
const CURRENT_MONTH_LABEL = monthLabel(CURRENT_MONTH);

export const metadata: Metadata = pageMeta(
  `ZESA Tariffs ${CURRENT_MONTH_LABEL} in ZiG & USD — Full ZETDC Table, ZWG ${fmt(BANDS[0].inclLevyZwg, 2)}/unit`,
  `Current ZERA-approved ZESA (ZETDC) tariffs for Zimbabwe in ${CURRENT_MONTH_LABEL}, in ZiG (ZWG) and USD: the first 50 units cost ZWG ${fmt(BANDS[0].inclLevyZwg, 4)} incl. the 6% REA levy. Full table of all six stepped bands, verified daily — free PDF download.`,
  "/zesa-tariffs/",
);

export default function TariffsPage() {
  // Each row deep-links to the page that answers "how much is N units of
  // ZESA" in full — the cumulative table is where that question gets asked.
  const cumulative: { label: string; upTo: number; total: number; href: string | null }[] = [];
  for (const cap of [50, 100, 200, 300, 400]) {
    const slug = `${cap}-units`;
    cumulative.push({
      label: `${cap} units`,
      upTo: cap,
      total: costForUnits(cap).totalZwg,
      href: UNIT_SLUGS.includes(slug) ? `/units/${slug}/` : null,
    });
  }
  const fullQuota = costForUnits(400).totalZwg;

  const jsonLd = [
    breadcrumb([["Current ZESA tariffs", "/zesa-tariffs/"]]),
    tariffDataset({ effectiveDate: TARIFFS.effectiveDate, firstDate: FIRST_DATE, rows: HISTORY.length }),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdProps(...jsonLd)} />
      <section className="border-b border-line bg-ink text-white">
        <div className="container-page py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-volt">
            Effective {TARIFFS.effectiveDate} · verified {TARIFFS.lastVerified}
          </p>
          <h1 className="font-display mt-3 text-4xl font-bold">Current ZESA tariffs<span aria-hidden className="text-volt">.</span></h1>
          <p className="mt-3 max-w-2xl text-white/70">
            ZERA-approved ZETDC prepaid tariffs for {CURRENT_MONTH_LABEL}, in ZiG (ZWG) and US dollars —
            every band, with and without the 6% Rural Electrification (REA) levy. Re-checked against
            the published schedule every day, not once a month.
          </p>
          <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href={`/zesa-tariffs/${CURRENT_MONTH}/`} className="underline hover:text-volt">
              Every {CURRENT_MONTH_LABEL} schedule →
            </Link>
            <Link href="/zesa-tariffs/history/" className="underline hover:text-volt">
              See how these rates have moved since {FIRST_DATE} →
            </Link>
            <Link href="/zesa-tariffs/pdf/" className="underline hover:text-volt">
              Download the {CURRENT_MONTH_LABEL} tariff table (PDF) →
            </Link>
          </p>
        </div>
      </section>

      <section className="container-page mt-10">
        <div className="scroll-hint rounded-2xl border border-line bg-card shadow-sm"><div tabIndex={0} role="region" aria-label="Tariff bands table (scrolls sideways)" className="overflow-x-auto rounded-2xl">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-line bg-paper text-left text-xs uppercase tracking-wider text-dim">
                <th className="px-2 py-3 font-medium sm:px-4">Consumption band (monthly)</th>
                <th className="whitespace-nowrap px-2 py-3 text-right font-medium sm:px-4">Base ZWG/unit</th>
                <th className="whitespace-nowrap px-2 py-3 text-right font-medium sm:px-4">Incl. 6% REA</th>
                <th className="whitespace-nowrap px-2 py-3 text-right font-medium sm:px-4">≈ USD/unit</th>
              </tr>
            </thead>
            <tbody>
              {BANDS.map((b, i) => (
                <tr key={b.label} className="border-b border-line last:border-0">
                  <td className="px-2 py-3 font-medium sm:px-4">
                    <span className="flex items-center gap-2">
                      <span aria-hidden className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ background: bandColor(i) }} />
                      {b.label}
                    </span>
                    {/* Price bar: band rate as a share of the top rate — makes the 3.2× ladder visible. */}
                    <span aria-hidden className="mt-1.5 ml-5 block h-1 max-w-40 rounded-full bg-paper">
                      <span className="block h-1 rounded-full" style={{ width: `${Math.round((b.inclLevyZwg / BANDS[BANDS.length - 1].inclLevyZwg) * 100)}%`, background: bandColor(i) }} />
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-3 text-right font-mono sm:px-4">{fmt(b.baseZwg, 4)}</td>
                  <td className="whitespace-nowrap px-2 py-3 text-right font-mono sm:px-4 font-semibold">{fmt(b.inclLevyZwg, 4)}</td>
                  <td className="whitespace-nowrap px-2 py-3 text-right font-mono sm:px-4">${fmt(b.usdApprox)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
        <p className="mt-3 text-xs text-dim">
          Source: ZERA-approved ZETDC schedule via Zimpricecheck & Magetsi. USD estimates only — you pay in ZWG unless
          using a USD channel. We verify this table against published rates and update it whenever tariffs change.
        </p>
      </section>

      <section className="container-page mt-14 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl font-bold">How the stepped tariff works</h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-dim">
            <p>
              ZESA does not charge a flat rate. Each calendar month, your meter starts at the cheapest band: the first
              50 units cost ZWG {fmt(BANDS[0].inclLevyZwg)} each. The next 50 cost a little more, and so on — six bands
              in total. The more you buy in a month, the more each extra unit costs.
            </p>
            <p>
              Your <strong className="text-ink">discounted quota is 400 kWh per month</strong>. Buying the full quota costs about
              ZWG {fmt(fullQuota)} (≈ US${fmt(zwgToUsd(fullQuota))}). Every unit beyond 400 kWh in the same month is
              charged at the top rate of ZWG {fmt(BANDS[5].inclLevyZwg)} — more than three times the entry band.
            </p>
            <p>
              <strong className="text-ink">The quota resets on the 1st of every month.</strong> That is why people say electricity is
              &ldquo;cheaper at the beginning of the month&rdquo; — prices never change with the date, but your cheap
              bands are available again.
            </p>
            <p>
              Your location makes no difference: high-density, medium-density or low-density, the tariff is the same.
              Only your monthly consumption — and whether it is your first purchase of the month — affects the price.
            </p>
          </div>
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold">What it costs, cumulatively</h2>
          <div className="scroll-hint mt-4 rounded-2xl border border-line bg-card shadow-sm"><div tabIndex={0} role="region" aria-label="Cumulative cost table (scrolls sideways)" className="overflow-x-auto rounded-2xl">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-line bg-paper text-left text-xs uppercase tracking-wider text-dim">
                  <th className="px-2 py-3 font-medium sm:px-4">Buying up to…</th>
                  <th className="whitespace-nowrap px-2 py-3 text-right font-medium sm:px-4">Total ZWG</th>
                  <th className="whitespace-nowrap px-2 py-3 text-right font-medium sm:px-4">≈ USD</th>
                </tr>
              </thead>
              <tbody>
                {cumulative.map((c) => (
                  <tr key={c.label} className="border-b border-line last:border-0">
                    <td className="px-2 py-3 font-medium sm:px-4">
                      {c.href ? (
                        <Link href={c.href} className="underline decoration-line hover:text-volt-deep">
                          {c.label}
                        </Link>
                      ) : (
                        c.label
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-right font-mono sm:px-4">{fmt(c.total)}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-right font-mono sm:px-4">${fmt(zwgToUsd(c.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
          <p className="mt-4 text-sm text-dim">
            Each row above opens the full breakdown for that number of units — what it costs, what
            it runs, and how the price has moved.{" "}
            <Link href="/units/" className="font-medium underline hover:text-volt-deep">
              Every amount and unit count in one table →
            </Link>
          </p>
          <div className="mt-5 rounded-lg border border-volt/60 bg-volt/10 p-4 text-sm leading-relaxed">
            <p className="font-semibold"><BulbIcon />Money-saving rule of thumb</p>
            <p className="mt-1">
              If your household uses more than 400 kWh a month, split large purchases across the month boundary: top up
              to your quota before the 1st, then buy the rest after the reset. Use the{" "}
              <Link href="/" className="font-semibold underline">calculator</Link> with &ldquo;units already bought&rdquo;
              to see your exact price before you pay.
            </p>
          </div>
          <div className="mt-5 rounded-lg border border-line bg-card p-4 text-sm leading-relaxed">
            <p className="font-semibold"><WrenchIcon />For developers</p>
            <p className="mt-1">
              These tariffs are a free JSON API — we track ZERA rate changes daily and keep it current:{" "}
              <a href="/api/v1/tariffs.json" className="font-mono text-xs font-semibold underline">
                zesa.tapiwa.me/api/v1/tariffs.json
              </a>
              . The full {HISTORY.length}-schedule series since {FIRST_DATE} is available as{" "}
              <a href="/api/v1/tariff-history.json" className="font-mono text-xs font-semibold underline">
                JSON
              </a>{" "}
              or{" "}
              <a href="/api/v1/tariff-history.csv" className="font-mono text-xs font-semibold underline">
                CSV
              </a>
              , free with attribution.
            </p>
          </div>
        </div>
      </section>

      {/* Month archive: /zesa-tariffs/2026-05/ got +690% impressions in GSC —
          people search "zesa tariffs {month} {year}", so every month page gets
          a crawlable, human-friendly link from this hub instead of being
          reachable only via prev/next hops. */}
      <section className="container-page mt-14">
        <h2 className="font-display text-2xl font-bold">
          Tariffs by month<span aria-hidden className="text-volt">.</span>
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-dim">
          What ZESA charged in any month since {FIRST_DATE} — every schedule published that month,
          or the rate that stayed in force when nothing changed.
        </p>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {monthKeys().map((key) => {
            const range = monthRange(key);
            return (
              <li key={key}>
                <Link
                  href={`/zesa-tariffs/${key}/`}
                  className="block rounded-xl border border-line bg-card px-4 py-3 transition hover:border-volt hover:shadow-sm"
                >
                  <span className="block text-sm font-semibold">{monthLabel(key)}</span>
                  {range && (
                    <span className="mt-0.5 block text-xs tabular-nums text-dim">
                      {range.min === range.max
                        ? `ZWG ${fmt(range.min, 4)}/unit`
                        : `ZWG ${fmt(range.min, 4)}–${fmt(range.max, 4)}/unit`}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="container-page mt-14">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-ink p-6 text-white sm:flex-row sm:items-center sm:p-8">
          <div>
            <h2 className="font-display text-xl font-bold">Ready to top up?</h2>
            <p className="mt-1 text-sm text-white/70">Buy ZESA tokens with EcoCash in USD or ZWG — token on screen and by SMS.</p>
          </div>
          <Link href="/buy/" className="shrink-0 rounded-lg bg-volt px-6 py-3 font-semibold text-ink transition hover:bg-volt/80">
            Buy tokens →
          </Link>
        </div>
      </section>
    </>
  );
}
