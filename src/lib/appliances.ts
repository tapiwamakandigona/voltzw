import { MONTHLY_QUOTA } from "@/lib/tariff";

/** Typical Zimbabwean household loads, used to answer the question people
 *  actually ask after "how much is N units" — *what does that run?*
 *
 *  Wattages are typical nameplate figures for the appliances sold locally,
 *  rounded on purpose: they make the numbers on each page concrete and
 *  comparable, and every page says out loud that they are estimates rather
 *  than metered readings. Fridges are duty-cycled, so they are expressed as
 *  kWh per day instead of a continuous draw. */
export type Appliance = {
  name: string;
  /** Continuous draw in watts (mutually exclusive with kwhPerDay). */
  watts?: number;
  /** Energy used over a full day of normal duty cycling. */
  kwhPerDay?: number;
};

export const APPLIANCES: Appliance[] = [
  { name: "Electric geyser (150 L)", watts: 3000 },
  { name: "Stove plate", watts: 2000 },
  { name: "Kettle (2 L)", watts: 2000 },
  { name: "Iron", watts: 1200 },
  { name: "Microwave", watts: 1000 },
  { name: "Borehole pump (1 hp)", watts: 750 },
  { name: "TV + decoder", watts: 120 },
  { name: "Five LED bulbs", watts: 50 },
  { name: "Wi-Fi router", watts: 10 },
  { name: "Fridge / freezer", kwhPerDay: 1.2 },
];

/** A household that uses its full discounted quota every month — the only
 *  consumption baseline on the site that comes from a published figure
 *  (ZETDC's 400 kWh monthly quota) rather than from a survey we do not have. */
export const QUOTA_DAILY_KWH = MONTHLY_QUOTA / 30;

/** Hours (or days) that `units` kWh keeps one appliance running. */
export function runtimeFor(units: number, a: Appliance): { hours: number; label: string } {
  const perHour = a.kwhPerDay !== undefined ? a.kwhPerDay / 24 : (a.watts ?? 0) / 1000;
  if (perHour <= 0 || units <= 0) return { hours: 0, label: "—" };
  const hours = units / perHour;
  return { hours, label: formatDuration(hours) };
}

/** "6 h 30 min" under two days, "12.5 days" above it — the unit that makes the
 *  number readable rather than technically precise. */
export function formatDuration(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }
  const days = hours / 24;
  return `${days.toLocaleString("en-US", { maximumFractionDigits: days < 10 ? 1 : 0 })} days`;
}

/** How long `units` lasts a household that would otherwise burn through the
 *  full 400 kWh quota in a month. */
export function daysOfQuotaUse(units: number): number {
  if (units <= 0) return 0;
  return units / QUOTA_DAILY_KWH;
}
