import type { Metadata } from "next";
import BuyFlow from "@/components/BuyFlow";

// Build-time payment mode (static export) — keep in sync with BuyFlow.tsx.
const PAYMENT_MODE = process.env.NEXT_PUBLIC_PAYMENT_MODE || "coming_soon";

export const metadata: Metadata = {
  title: "Buy ZESA Tokens Online — EcoCash, Zimswitch, USD & ZWG",
  description:
    "Buy prepaid ZESA electricity tokens online in minutes. Pay with EcoCash, Zimswitch, InnBucks or bank — in US dollars or ZWG. Token delivered instantly on screen and by SMS.",
  alternates: { canonical: "/buy/" },
};

export default function BuyPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      {/* Desktop: the three step-cards sit beside the form instead of
          leaving dead whitespace either side of a lone centered column. */}
      <div className="mx-auto max-w-xl lg:grid lg:max-w-4xl lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start lg:gap-12">
        <div>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Buy ZESA tokens<span className="text-volt-deep">.</span>
        </h1>
        <p className="mt-3 text-dim">
          {PAYMENT_MODE === "semi_auto" ? (
            <>
              Verify your meter, pay by <strong className="text-ink">EcoCash</strong> from your
              own phone, and get your token on screen and by SMS. No queues, no airtime hassle.
            </>
          ) : (
            <>
              Verify your meter, pay with EcoCash, Zimswitch or your bank — in{" "}
              <strong className="text-ink">USD or ZWG</strong> — and get your token on screen
              and by SMS. No queues, no airtime hassle.
            </>
          )}
        </p>
        <div className="mt-8">
          <BuyFlow />
        </div>
        </div>
        <div className="mt-10 grid gap-4 text-sm sm:grid-cols-3 lg:mt-0 lg:grid-cols-1">
          <div className="rounded-lg border border-line bg-card p-4">
            <p className="font-display font-semibold">1. Verify</p>
            <p className="mt-1 text-dim">We confirm the registered name on your meter before you pay.</p>
          </div>
          <div className="rounded-lg border border-line bg-card p-4">
            <p className="font-display font-semibold">2. Pay securely</p>
            <p className="mt-1 text-dim">
              {PAYMENT_MODE === "semi_auto"
                ? "Pay by EcoCash from your own phone — we never see your PIN."
                : "Checkout happens on Paynow — we never see your PIN or card."}
            </p>
          </div>
          <div className="rounded-lg border border-line bg-card p-4">
            <p className="font-display font-semibold">3. Get your token</p>
            <p className="mt-1 text-dim">Delivered instantly on screen and by SMS to your phone.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
