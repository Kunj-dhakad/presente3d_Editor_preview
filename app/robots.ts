import type { MetadataRoute } from "next";
import { SITE } from "@shared/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/editor/", "/settings", "/billing", "/admin", "/help", "/read/", "/reset-password", "/verify-email"] },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
