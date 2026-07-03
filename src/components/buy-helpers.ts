/** Pure helpers shared by the buy-flow components. Kept free of React so
 *  they can be unit-tested with vitest alongside src/lib. */

/** Mirrors the backend's MAX_AMOUNT in functions/vend — reject before submit. */
export const MAX_AMOUNT = 10_000;

/** Econet/NetOne mobile formats the vend function accepts. */
export const PHONE_RE = /^(07\d{8}|\+2637\d{8})$/;

export function isValidZimMobile(phone: string): boolean {
  return PHONE_RE.test(phone);
}

/** Keep only digits and at most one decimal point (the previous
 *  `replace(/[^\d.]/g, "")` admitted "1.2.3"). */
export function sanitizeAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
}

/** Client-side amount validation mirroring the backend rules.
 *  Returns a human error message, or null when the amount is acceptable.
 *  An empty field returns null too — emptiness is the submit button's job,
 *  not an error to shout about while the customer is still typing. */
export function amountError(raw: string): string | null {
  if (raw.trim() === "") return null;
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return "Enter an amount greater than 0.";
  if (n > MAX_AMOUNT) return `The maximum per purchase is ${MAX_AMOUNT.toLocaleString("en-US")}. Split larger top-ups into more than one purchase.`;
  return null;
}

/** CONTRACT-3: the order ref is persisted here before any payment
 *  redirect/handoff so /buy/status can recover it when the host's
 *  trailing-slash redirect drops the ?ref= query string. */
export const LAST_ORDER_REF_KEY = "voltzw:lastOrderRef";

export function saveLastOrderRef(ref: string): void {
  if (typeof window === "undefined" || !ref) return;
  try {
    window.localStorage.setItem(LAST_ORDER_REF_KEY, ref);
  } catch { /* storage full / private mode — non-fatal */ }
}

export function readLastOrderRef(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LAST_ORDER_REF_KEY);
  } catch {
    return null;
  }
}
