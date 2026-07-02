/** Service-fee math shared by the frontend.
 *  NOTE: functions/vend/src/main.js has an identical copy of these two
 *  functions (the function bundle can't import TS) — keep them in sync. */

export const DEFAULT_FEE_PCT = 10;

/** Parse a SERVICE_FEE_PCT-style value. Defaults to 10 when unset/invalid; 0 is valid (fee disabled). */
export function parseFeePct(raw: unknown): number {
  if (raw === undefined || raw === null || raw === "") return DEFAULT_FEE_PCT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_FEE_PCT;
  return n;
}

/** Electricity token value vended for a gross customer payment.
 *  Fee is taken out of the gross: tokenValue = gross / (1 + fee/100), rounded to cents. */
export function tokenValueForGross(gross: number, feePct: number): number {
  return Math.round((gross / (1 + feePct / 100)) * 100) / 100;
}
