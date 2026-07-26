import { NextResponse } from "next/server";
import { FIRST_DATE, HISTORY, LATEST } from "@/lib/history";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json({
    apiVersion: "1",
    name: "VoltZW ZESA tariff history",
    docs: "https://zesa.tapiwa.me/zesa-tariffs/history/",
    license: "Free to use with attribution to zesa.tapiwa.me",
    fields: {
      d: "date the schedule took effect (YYYY-MM-DD)",
      base: "six band prices in ZWG/kWh, excluding the levy",
      incl: "six band prices in ZWG/kWh, including the 6% REA levy",
      fx: "published ZWG per USD reference rate",
    },
    from: FIRST_DATE,
    to: LATEST?.d ?? null,
    schedules: HISTORY.length,
    data: HISTORY,
  });
}
