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
  ];
}
