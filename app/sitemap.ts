import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1, alternates: { languages: { en: `${siteUrl}/`, es: `${siteUrl}/es` } } },
    { url: `${siteUrl}/es`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/start`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
