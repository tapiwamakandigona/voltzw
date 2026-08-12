"use client";

export type AnalyticsParams = Record<string, string | boolean>;

declare global {
  interface Window {
    tapiwaTrack?: (name: string, params?: AnalyticsParams) => boolean;
  }
}

/** Analytics is deliberately best-effort: a blocked or broken tag can never
 * interrupt a calculator, share, clipboard or purchase action. */
export function track(name: string, params: AnalyticsParams = {}): boolean {
  if (typeof window === "undefined" || typeof window.tapiwaTrack !== "function") return false;
  try {
    return window.tapiwaTrack(name, params) === true;
  } catch {
    return false;
  }
}
