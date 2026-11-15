import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // The admin, developer portal and AqarArena Sales are private; their pages also say noindex.
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/portal", "/sales"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
