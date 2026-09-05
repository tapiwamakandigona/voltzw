"use client";

import Link from "next/link";
import { canBuy, useHealth } from "@/components/payment-mode";

/** Homepage purchase promo. The headline claim ("live now") is only made when
 *  the vend function actually accepts orders — previously it was hard-coded and
 *  stayed up while /order was returning 503. */
export default function BuyPromo() {
  const health = useHealth();
  const live = !health.loading && canBuy(health);

  return (
    <section id="buy" className="container-page mt-16">
      <div className="rounded-2xl bg-ink p-6 text-white sm:p-10">
        <h2 className="font-display text-2xl font-bold">
          {live ? (
            <>
              Buy ZESA tokens on VoltZW — <span className="text-volt">live now</span>
            </>
          ) : (
            <>
              ZESA token purchases — <span className="text-volt">check availability</span>
            </>
          )}
        </h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-white/70">
          {live ? (
            <>
              See the available payment methods, currencies and service fee on the buy page.
              We verify your meter first. After a successful purchase,
              your 20-digit token appears on screen and is sent by SMS. Every purchase stays
              attached to your meter number — a lost SMS never means a lost token. Perfect for
              topping up a family meter from the diaspora.
            </>
          ) : (
            <>
              Use the buy page to check your ZETDC prepaid meter and current payment availability.
              If payments are closed, you can request a launch update. No launch date is promised.
              The calculator and tariff guides remain free.
            </>
          )}
        </p>
        <Link
          href="/buy/"
          className="mt-5 inline-block rounded-lg bg-volt px-6 py-3 font-semibold text-ink transition hover:bg-volt/80"
        >
          {live ? "Buy tokens now →" : "Check your meter & join the list →"}
        </Link>
      </div>
    </section>
  );
}
