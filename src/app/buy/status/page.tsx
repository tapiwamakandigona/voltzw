import type { Metadata } from "next";
import TokenStatus from "@/components/TokenStatus";

export const metadata: Metadata = {
  title: "Your ZESA Token",
  robots: { index: false },
};

export default function StatusPage() {
  return (
    <div className="container-page py-10 sm:py-16">
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Your token</h1>
        <div className="mt-6">
          <TokenStatus />
        </div>
      </div>
    </div>
  );
}
