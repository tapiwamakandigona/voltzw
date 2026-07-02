import { NextResponse } from "next/server";
import tariffs from "@/data/tariffs.json";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json({
    name: "VoltZW ZESA Tariff API",
    docs: "https://zesa.tapiwa.me/zesa-tariffs/",
    license: "Free to use with attribution to zesa.tapiwa.me",
    ...tariffs,
  });
}
