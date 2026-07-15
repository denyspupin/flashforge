import type { MetadataRoute } from "next"

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://flashforge.denyspupin.dev"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/explore`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ]
}
