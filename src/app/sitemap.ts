import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Public, indexable pages only. Add marketing/guide pages here as they ship.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
