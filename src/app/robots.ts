import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // The admin and developer portal are private; their pages also say noindex.
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/portal"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
