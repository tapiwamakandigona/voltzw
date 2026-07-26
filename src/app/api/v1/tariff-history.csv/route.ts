import { toCsv } from "@/lib/history";

export const dynamic = "force-static";

export async function GET() {
  return new Response(toCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'inline; filename="voltzw-zesa-tariff-history.csv"',
    },
  });
}
