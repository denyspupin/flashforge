import type { MetadataRoute } from "next"

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://flashforge.denyspupin.dev"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/explore"],
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard",
          "/decks",
          "/collections",
          "/history",
          "/notifications",
          "/profile",
          "/study",
          "/login",
          "/register",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
