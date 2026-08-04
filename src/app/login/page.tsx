import type { Metadata } from "next";
import Link from "next/link";

/** The old volt-zw site had a /login page that Google still crawls (it shows
 *  up as a 404 in Search Console). VoltZW deliberately has no accounts, so
 *  this stub answers the crawl with a 200, explains that, and points people
 *  at the buy flow. Kept out of the index and the sitemap. */
export const metadata: Metadata = {
  title: "No Login Needed — VoltZW",
  robots: { index: false, follow: true },
};

export default function LoginGone() {
  return (
    <section className="container-page my-16 max-w-xl">
      <h1 className="font-display text-3xl font-bold">
        No login needed<span aria-hidden className="text-volt">.</span>
      </h1>
      <p className="mt-4 text-dim">
        VoltZW doesn&apos;t have accounts. Buy tokens, check tariffs and retrieve lost tokens —
        all without signing in.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/buy/"
          className="inline-flex min-h-11 items-center rounded-lg bg-volt px-4 font-display font-semibold text-ink"
        >
          Buy ZESA tokens →
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-4 font-display font-semibold"
        >
          Open the calculator
        </Link>
      </div>
    </section>
  );
}
