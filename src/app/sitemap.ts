import type { MetadataRoute } from "next";
import { TARIFFS } from "@/lib/tariff";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://zesa.tapiwa.me";
  const lastModified = new Date(TARIFFS.lastVerified + "T00:00:00Z");
  return [
    { url: `${base}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/buy/`, lastModified, changeFrequency: "weekly", priority: 0.95 },
    { url: `${base}/zesa-tariffs/`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/retrieve-zesa-token/`, changeFrequency: "monthly", priority: 0.9 },
  ];
}
