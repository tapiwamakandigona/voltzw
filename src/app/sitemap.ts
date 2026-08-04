import type { MetadataRoute } from "next";
import { TARIFFS } from "@/lib/tariff";
import { AMOUNT_SLUGS, UNIT_SLUGS } from "@/lib/amounts";
import { monthKeys } from "@/lib/history";

export const dynamic = "force-static";

/** Every indexable URL, with `lastModified` tied to the tariff sync so the
 *  daily data refresh is a real freshness signal instead of an invisible one. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://zesa.tapiwa.me";
  const lastModified = new Date(TARIFFS.lastVerified + "T00:00:00Z");

  const core: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${base}/buy/`, lastModified, changeFrequency: "weekly", priority: 0.95 },
    { url: `${base}/zesa-tariffs/`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/zesa-tariffs/history/`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/units/`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/retrieve-zesa-token/`, changeFrequency: "monthly", priority: 0.9 },
  ];

  const amounts: MetadataRoute.Sitemap = [...AMOUNT_SLUGS, ...UNIT_SLUGS].map((slug) => ({
    url: `${base}/units/${slug}/`,
    lastModified,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const months: MetadataRoute.Sitemap = monthKeys().map((key, i) => ({
    url: `${base}/zesa-tariffs/${key}/`,
    lastModified,
    // The current month keeps changing; closed months are archives.
    changeFrequency: i === 0 ? "daily" : "monthly",
    priority: i === 0 ? 0.7 : 0.5,
  }));

  return [...core, ...amounts, ...months];
}
