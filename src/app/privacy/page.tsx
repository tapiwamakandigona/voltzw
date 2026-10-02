import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta } from "@/lib/seo";

/** Plain-language privacy policy. Kept factual and specific to what the code
 *  actually does (BuyFlow / vend function / public/analytics.js / AdSense) —
 *  update it in the same PR as any change to what the site collects. */
export const metadata: Metadata = pageMeta(
  "Privacy policy",
  "What VoltZW collects and why: the free ZESA tools collect nothing, purchases share only what is needed to vend a token, analytics is opt-in, and ads on informational pages are served by Google AdSense.",
  "/privacy/",
);

const UPDATED = "2 October 2026";

const linkCls = "underline decoration-volt-deep underline-offset-2 hover:text-volt-deep";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-20">
      <h2 id={`${id}-h`} className="font-display text-xl font-bold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-dim">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <section className="border-b border-line bg-ink text-white">
        <div className="container-page py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-volt">Last updated {UPDATED}</p>
          <h1 className="font-display mt-3 text-4xl font-bold">Privacy policy<span aria-hidden className="text-volt">.</span></h1>
          <p className="mt-3 max-w-2xl text-white/70">
            VoltZW (zesa.tapiwa.me) is an independent site run by Tapiwa Makandigona. It is not affiliated
            with ZESA Holdings or ZETDC. This page explains, in plain language, what the site collects, why,
            and the choices you have.
          </p>
        </div>
      </section>

      <div className="container-page mt-10 max-w-3xl space-y-10">
        <Section id="free-tools" title="The free tools collect nothing">
          <p>
            The calculator, tariff tables, units pages and token-retrieval guides work entirely in your
            browser. What you type into the calculator is not sent to VoltZW, and no account or login is
            needed to use any of them.
          </p>
        </Section>

        <Section id="buying" title="Buying tokens">
          <p>Only if you use the <Link href="/buy/" className={linkCls}>Buy page</Link>, VoltZW handles:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li><strong className="text-ink">Meter number</strong> — to look up the name and address registered to the meter, so you can confirm it is the right one, and to issue the token.</li>
            <li><strong className="text-ink">Mobile number</strong> — to take and match your EcoCash payment and to reach you about the order.</li>
            <li><strong className="text-ink">Email address (optional)</strong> — for a receipt.</li>
            <li><strong className="text-ink">Order details</strong> — amount, currency, an order reference, the order status, and the token, units and receipt that were issued.</li>
          </ul>
          <p>
            These are stored in VoltZW&apos;s database on Appwrite Cloud and shared only with the services
            needed to complete the purchase: Hot Recharge (the service that vends the ZESA token), Paynow
            (the payment gateway, when you pay through Paynow checkout) and EcoCash (your mobile-money
            payment). When buying is paused, the waitlist form stores the same contact details so you can be
            told when it reopens. Your details are used only for your order or that notice, and are never sold.
          </p>
          <p>
            Order records are kept so a token can be looked up again and payment questions can be resolved.
            To have your waitlist or order details deleted, email the address at the bottom of this page.
          </p>
        </Section>

        <Section id="device" title="What is stored on your device">
          <p>
            After a purchase, the Buy page keeps your latest order reference in your browser&apos;s local
            storage so it can show that order&apos;s status when you come back. Clearing this site&apos;s data
            in your browser removes it. Beyond that, cookies are only set by the optional analytics and the ads
            described below.
          </p>
        </Section>

        <Section id="analytics" title="Optional analytics">
          <p>
            Google Analytics loads <strong className="text-ink">only if you choose &ldquo;Allow analytics&rdquo;</strong>{" "}
            in the privacy choices panel. Nothing from Google Analytics loads before that, and browsers that
            send Do Not Track or Global Privacy Control are treated as a &ldquo;no&rdquo; automatically.
          </p>
          <p>
            If you allow it, Analytics records page paths, hostnames and fixed actions such as using the
            calculator. It never receives form contents, meter numbers, names, phone numbers or email
            addresses. Your choice is remembered in a first-party cookie shared across tapiwa.me sites for up
            to six months; Analytics event data is kept for up to 14 months. You can change your choice at
            any time from the privacy choices control on the page.
          </p>
        </Section>

        <Section id="ads" title="Advertising">
          <p>
            Some informational pages — such as the units, tariff and token-retrieval guides — show ads served
            by Google AdSense, each labelled &ldquo;Advertisement&rdquo;. VoltZW does not place ads on the
            calculator, the Buy pages or admin pages.
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website or other websites.</li>
            <li>Google&apos;s use of advertising cookies enables it and its partners to serve ads to you based on your visit to this site and/or other sites on the Internet.</li>
            <li>
              You can opt out of personalised advertising in{" "}
              <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer" className={linkCls}>Google Ads Settings</a>,
              and out of other vendors&apos; cookies for personalised advertising at{" "}
              <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className={linkCls}>aboutads.info</a>{" "}
              (or <a href="https://www.youronlinechoices.eu/" target="_blank" rel="noopener noreferrer" className={linkCls}>youronlinechoices.eu</a> in Europe).
            </li>
            <li>
              How Google uses information from sites that use its services:{" "}
              <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer" className={linkCls}>policies.google.com/technologies/partner-sites</a>.
            </li>
          </ul>
        </Section>

        <Section id="hosting" title="Hosting">
          <p>
            The site and its purchase service run on Appwrite Cloud, which processes standard technical
            request data, such as IP address and browser type, to deliver pages and keep the service secure.
          </p>
        </Section>

        <Section id="contact" title="Questions, deletion requests and changes">
          <p>
            Email <a href="mailto:silentics.org@gmail.com" className={linkCls}>silentics.org@gmail.com</a>. If this
            policy changes, the date at the top of this page changes with it.
          </p>
        </Section>
      </div>
    </>
  );
}
