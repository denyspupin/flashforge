import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

import { isValidShareToken } from "@/lib/share-token"

const isPublicRoute = createRouteMatcher([
  "/",
  "/s(.*)",
  "/login(.*)",
  "/register(.*)",
  "/api/v1/languages",
  "/api/v1/topics",
  "/api/v1/community(.*)",
  "/api/webhooks/clerk",
])

const isShareLinkRoute = createRouteMatcher([
  "/explore/decks/:id",
  "/explore/decks/:id/study",
  "/explore/collections/:id",
])

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return
  }

  // Shared links are the only guest surface: deck and collection detail pages
  // plus the guest study player open for visitors carrying a share token.
  // The token's validity against the DB is enforced by the page/route itself.
  if (
    isShareLinkRoute(req) &&
    isValidShareToken(req.nextUrl.searchParams.get("share"))
  ) {
    return
  }

  await auth.protect()
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
