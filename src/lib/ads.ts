/**
 * Google AdSense configuration.
 *
 * `ADSENSE_CLIENT` is the site's **public** AdSense publisher ID. It is not a
 * secret — it ships in the `<script>` tag and every `<ins>` ad slot on every
 * page that serves ads, so committing it is correct and expected.
 *
 * Everything is driven by env so ads can be turned off site-wide (set
 * `NEXT_PUBLIC_ADSENSE_CLIENT=""`) or re-pointed without a code change. Because
 * this is a static export, `NEXT_PUBLIC_*` values are inlined at build time.
 *
 * Two ways to actually serve ads once this is live and the site is approved in
 * AdSense (see docs/adsense.md):
 *   1. Auto ads — just leave the loader on and toggle Auto ads in the AdSense
 *      dashboard. No slot IDs needed; Google places the ads.
 *   2. Manual units — create display ad units in the dashboard, copy each slot
 *      ID into the env vars below, and the <Ad/> components light up in the
 *      exact, tasteful spots chosen in the code. A slot left empty renders
 *      nothing (no blank ad boxes), so manual placement is safe before the
 *      slot IDs exist.
 */

export const ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "ca-pub-5182383335652302";

/** True when a publisher ID is configured — gates the loader and every slot. */
export const ADS_ENABLED = ADSENSE_CLIENT.trim().length > 0;

/**
 * Slot IDs for the hand-placed in-content units. Empty by default so nothing
 * renders until a real slot ID from the AdSense dashboard is supplied. These
 * are public values too and may be committed once they exist.
 */
export const AD_SLOTS = {
  unitsInContent: process.env.NEXT_PUBLIC_ADS_SLOT_UNITS ?? "",
  tariffsInContent: process.env.NEXT_PUBLIC_ADS_SLOT_TARIFFS ?? "",
  retrieveInContent: process.env.NEXT_PUBLIC_ADS_SLOT_RETRIEVE ?? "",
} as const;
