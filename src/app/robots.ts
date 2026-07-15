import type { MetadataRoute } from "next";

import { getAppSiteUrl } from "@/lib/supabase/config";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getAppSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/join",
        "/sign-in",
        "/sign-up",
        "/forgot-password",
        "/reset-password",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
