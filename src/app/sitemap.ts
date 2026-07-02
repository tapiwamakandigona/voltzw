import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://zesa.tapiwa.me";
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/buy/`, changeFrequency: "weekly", priority: 0.95 },
    { url: `${base}/zesa-tariffs/`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/retrieve-zesa-token/`, changeFrequency: "monthly", priority: 0.9 },
  ];
}
