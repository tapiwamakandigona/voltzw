"use client";

import { useEffect } from "react";
import { ADSENSE_CLIENT, ADS_ENABLED } from "@/lib/ads";

type AdProps = {
  /** AdSense ad-unit slot ID (from the dashboard). Empty = renders nothing. */
  slot: string;
  /** AdSense format. "auto" is a responsive display unit. */
  format?: string;
  /** Extra classes on the wrapper. */
  className?: string;
};

/**
 * One in-content AdSense display unit.
 *
 * Deliberately conservative, to keep ads "neat":
 *  - Renders nothing at all unless both a publisher ID and a slot ID exist, so
 *    there are never empty grey ad boxes on the page.
 *  - Reserves a min-height so a late-loading ad does not shift the layout (CLS).
 *  - Carries a small "Advertisement" label, as AdSense policy expects.
 *  - Is an <aside>, not inside the main article flow's headings.
 *
 * The push() is fired after mount; the adsbygoogle.js loader (added once in the
 * root layout) processes the queue when it arrives, so order does not matter.
 */
export function Ad({ slot, format = "auto", className = "" }: AdProps) {
  useEffect(() => {
    if (!ADS_ENABLED || !slot) return;
    try {
      // adsbygoogle is injected by the loader script in the root layout.
      ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ??= []).push({});
    } catch {
      /* no-op: ad blocked, offline, or loader not present */
    }
  }, [slot]);

  if (!ADS_ENABLED || !slot) return null;

  return (
    <aside
      aria-label="Advertisement"
      className={`my-10 ${className}`}
    >
      <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-dim/70">
        Advertisement
      </p>
      <ins
        className="adsbygoogle block"
        style={{ display: "block", minHeight: 110 }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </aside>
  );
}
