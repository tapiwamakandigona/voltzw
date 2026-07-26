"use client";

import { useEffect, useState } from "react";

export const API = "https://voltzw-vend.appwrite.network";

/**
 * Payment mode, resolved at RUNTIME from the vend function's /health.
 *
 * The static export bakes NEXT_PUBLIC_PAYMENT_MODE in at build time, so a site
 * built for `semi_auto` kept advertising live purchases while the function was
 * still on `coming_soon` — every customer who verified a meter got a 503 from
 * /order. The function is the single source of truth; the build-time constant
 * is only the optimistic first paint.
 */
export type PaymentMode = "coming_soon" | "semi_auto" | "paynow";

const MODES: PaymentMode[] = ["coming_soon", "semi_auto", "paynow"];

export const BUILD_MODE: PaymentMode = MODES.includes(
  process.env.NEXT_PUBLIC_PAYMENT_MODE as PaymentMode,
)
  ? (process.env.NEXT_PUBLIC_PAYMENT_MODE as PaymentMode)
  : "coming_soon";

export type Health = {
  mode: PaymentMode;
  /** Hot Recharge + both Paynow key pairs present on the function. */
  configured: boolean;
  feePct: number | null;
  /** True until /health answers (or fails). */
  loading: boolean;
};

type HealthResponse = { configured?: boolean; paymentMode?: string; feePct?: number };

let cached: Promise<HealthResponse | null> | null = null;

/** One /health request per page load, shared by every component. */
export function fetchHealth(): Promise<HealthResponse | null> {
  if (!cached) {
    cached = fetch(`${API}/health`)
      .then((r) => (r.ok ? (r.json() as Promise<HealthResponse>) : null))
      .catch(() => null);
  }
  return cached;
}

/** Test seam / SSR-safe reset. */
export function resetHealthCache() {
  cached = null;
}

export function normalizeMode(raw: unknown): PaymentMode | null {
  return MODES.includes(raw as PaymentMode) ? (raw as PaymentMode) : null;
}

/** Live purchasing is possible only when the function says so. */
export function canBuy(h: Pick<Health, "mode" | "configured">): boolean {
  if (h.mode === "semi_auto") return true; // doesn't depend on the Paynow config
  if (h.mode === "paynow") return h.configured;
  return false;
}

export function useHealth(): Health {
  const [state, setState] = useState<Health>({
    mode: BUILD_MODE,
    configured: false,
    feePct: null,
    loading: true,
  });

  useEffect(() => {
    let alive = true;
    fetchHealth().then((h) => {
      if (!alive) return;
      setState({
        // /health unreachable → fall back to the build-time mode rather than
        // claiming the shop is shut.
        mode: normalizeMode(h?.paymentMode) ?? BUILD_MODE,
        configured: h?.configured === true,
        feePct: typeof h?.feePct === "number" && h.feePct >= 0 ? h.feePct : null,
        loading: false,
      });
    });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
