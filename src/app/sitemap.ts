import type { MetadataRoute } from "next";

import { getAppSiteUrl } from "@/lib/supabase/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getAppSiteUrl();

  return [
    {
      url: siteUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/upload-your-own`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/templates`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/contact`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/support/data-sources`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
