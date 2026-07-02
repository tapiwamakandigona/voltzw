import type { Metadata } from "next";
import AdminOrders from "@/components/AdminOrders";

export const metadata: Metadata = {
  title: "Orders admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="container-page py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Orders</h1>
        <p className="mt-2 text-sm text-dim">
          Semi-auto order book. Clear the needs-attention queue first — those customers have already paid.
        </p>
        <div className="mt-6">
          <AdminOrders />
        </div>
      </div>
    </div>
  );
}
