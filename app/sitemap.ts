import type { MetadataRoute } from "next";
import { SITE } from "@shared/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: [string, number][] = [["", 1], ["/pricing", 0.9], ["/signup", 0.8], ["/login", 0.5], ["/contact", 0.5], ["/terms", 0.3], ["/privacy", 0.3], ["/refund", 0.3]];
  return pages.map(([path, priority]) => ({ url: `${SITE.url}${path}`, lastModified: new Date(), changeFrequency: "monthly", priority }));
}
