import { NextResponse } from "next/server";
import tariffs from "@/data/tariffs.json";
import { FIRST_DATE, HISTORY } from "@/lib/history";

export const dynamic = "force-static";

/** Versioned tariff endpoint. `/api/tariffs.json` stays as the unversioned
 *  alias — the vend function reads it for its FX sanity check, so it must
 *  never be removed. */
export async function GET() {
  return NextResponse.json({
    apiVersion: "1",
    name: "VoltZW ZESA Tariff API",
    docs: "https://zesa.tapiwa.me/zesa-tariffs/",
    license: "Free to use with attribution to zesa.tapiwa.me",
    endpoints: {
      current: "https://zesa.tapiwa.me/api/v1/tariffs.json",
      historyJson: "https://zesa.tapiwa.me/api/v1/tariff-history.json",
      historyCsv: "https://zesa.tapiwa.me/api/v1/tariff-history.csv",
    },
    history: { from: FIRST_DATE, schedules: HISTORY.length },
    ...tariffs,
  });
}
