import { PRIVATE_PATHS } from "@/lib/seo-routes";
import { absoluteUrl } from "@/lib/site";

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: [...PRIVATE_PATHS] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
