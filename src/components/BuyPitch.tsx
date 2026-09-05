"use client";

import Link from "next/link";
import { canBuy, useHealth } from "@/components/payment-mode";

/** The /buy hero copy, told the truth by /health rather than by the build.
 *  While /health is in flight we describe the flow without claiming it is
 *  live — a half-second of neutral copy beats a promise the API refuses. */
export function BuyPitch() {
  const health = useHealth();
  const live = canBuy(health);

  if (health.loading) {
    return (
      <p className="mt-3 text-dim">
        Check your meter and current payment availability below. The calculator and
        tariff guides are free.
      </p>
    );
  }

  if (!live) {
    return (
      <p className="mt-3 text-dim">
        <strong className="text-ink">Payments are not open on this page right now.</strong>{" "}
        You can check your meter below and request a launch update. No launch date is promised.
        If a service is unavailable, try again later. Meanwhile the{" "}
        <Link href="/" className="font-medium text-volt-deep underline">
          calculator
        </Link>{" "}
        and{" "}
        <Link href="/zesa-tariffs/" className="font-medium text-volt-deep underline">
          tariffs
        </Link>{" "}
        are free.
      </p>
    );
  }

  return (
    <p className="mt-3 text-dim">
      {health.mode === "semi_auto" ? (
        <>
          Verify your meter, pay by <strong className="text-ink">EcoCash</strong> from your own
          phone, and get your token on screen and by SMS. No queues, no airtime hassle.
        </>
      ) : (
        <>
          Verify your meter, pay with EcoCash, Zimswitch or your bank — in{" "}
          <strong className="text-ink">USD or ZWG</strong> — and get your token on screen and by
          SMS. No queues, no airtime hassle.
        </>
      )}
    </p>
  );
}

/** Step 2 of the three-step strip: how the customer actually pays. */
export function PayStep() {
  const health = useHealth();
  if (!canBuy(health)) {
    return <p className="mt-1 text-dim">Check current availability below. When payments are closed, you can request a launch update instead.</p>;
  }
  return (
    <p className="mt-1 text-dim">
      {health.mode === "semi_auto"
        ? "Pay by EcoCash from your own phone — we never see your PIN."
        : "Checkout happens on Paynow — we never see your PIN or card."}
    </p>
  );
}
