# ADR 0001 — Move dashboard and profile reads to the client

- **Status:** Accepted
- **Date:** 2026-06-13
- **Branch:** `feat/client-side-optimization`

## Context

`/dashboard` and `/profile` are RSC pages that hit the database on every render. Each render of `/dashboard` runs six queries through `loadDashboardData()`. Each render of `/profile` runs eight queries through `loadProfileData()` **and** `loadDashboardData()` in parallel — the latter only for a single timestamp that already exists on the user object.

Both pages also call Clerk's `currentUser()` server-side to resolve a display name and avatar URL, even though both are available on the client via Clerk's `useUser()`.

The result:

- The server does substantial work on every page load, even though TanStack Query is already wired up (`components/providers.tsx`) and most other pages (deck list, study player, explore) already fetch on the client.
- The existing client-side mutations (`ContinueStudyingCard`, `RecentDeckCard`, `ProfileSettingsForm`) call `router.refresh()` to re-pull the data, which re-runs the whole RSC query set.
- There is no `Skeleton` component installed; loading states are hand-rolled `animate-pulse` divs.
- There are no `error.tsx` boundaries, so a single failed query crashes the whole route.

## Decision

Move the data fetching for `/dashboard` and `/profile` to the client using TanStack Query's `useSuspenseQuery`, and wrap the page in a React `<Suspense>` boundary with a shadcn `Skeleton` fallback. Cache the static reference endpoints. Add `error.tsx` boundaries for graceful failure.

### Mechanics

1. **Two thin GET endpoints** under `/api/v1/` wrap the existing `lib/queries/*` functions. The query functions stay as the single source of truth for SQL.
   - `GET /api/v1/dashboard` → returns `DashboardData` (same shape as `loadDashboardData`).
   - `GET /api/v1/profile` → returns `ProfileData` (same shape as `loadProfileData`).

2. **Thin RSC page shells** at `app/(dashboard)/dashboard/page.tsx` and `app/(dashboard)/profile/page.tsx`:
   ```tsx
   <Suspense fallback={<PageSkeleton />}>
     <PageView />
   </Suspense>
   ```

3. **Client components** `components/dashboard/dashboard-view.tsx` and `components/profile/profile-view.tsx` use `useSuspenseQuery` against the new endpoints. `greetingFor()` and `isStreakFreshToday()` (both use `new Date()`) move to the client — fine since the user is in their own timezone.

4. **Profile source of truth for streak** drops the redundant `loadDashboardData()` call. `streakUpdatedAt` already lives on the user object, so `isStreakFreshToday()` reads from there.

5. **Clerk image URL** comes from `useUser()` on the client. The server-side `currentUser()` call for `clerkImageUrl` is removed.

6. **Mutation invalidation** replaces `router.refresh()` with `queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })` (or `profile()`). Precise, no full page re-render.

7. **Centralized query keys** in `hooks/query-keys.ts` to drive consistent invalidation.

8. **Static reference data is cached**:
   - `app/api/v1/languages/route.ts`: `export const revalidate = 3600` (replaces `force-dynamic`).
   - `app/api/v1/topics/route.ts`: same.

9. **`error.tsx` boundaries** for `app/(dashboard)/error.tsx`, `app/(dashboard)/dashboard/error.tsx`, and `app/(dashboard)/profile/error.tsx`. Errors are caught and a retry UI is shown.

10. **shadcn `Skeleton` component** installed at `components/ui/skeleton.tsx` and used by new `dashboard-skeleton.tsx` and `profile-skeleton.tsx` files.

## Consequences

### Positive
- The RSC path for `/dashboard` and `/profile` does zero database work. The static frame renders immediately.
- Mutations feel snappier: `router.refresh()` (which re-runs every RSC query) is replaced by TanStack Query's precise invalidation.
- Layout-stable loading: `Skeleton` shapes match the final layout exactly.
- No behavior change for end users other than a brief skeleton on cold load.
- The static reference endpoints (`/api/v1/languages`, `/api/v1/topics`) shed `force-dynamic` overhead.

### Negative / risks
- The new Suspense boundaries add a small JS payload (the `useSuspenseQuery` shim) and require the `QueryClient` to be ready on first paint. Already configured.
- Cold loads show a skeleton briefly. On warm navigations the data is in the cache, so there is no flash.
- We depend on TanStack Query staying installed. Already in `package.json`.

### Out of scope
- Caching `/api/v1/community/decks` (real-time search, separate decision).
- Streaming SSR with `loading.tsx` files (separate decision).
- Caching `/api/v1/users/me` (small query, dynamic by intent).

## Alternatives considered

- **Keep RSC + `router.refresh()`**: rejected — doesn't address the server load.
- **Switch to fully static pages with client-only data**: this is the chosen path; "fully static" is achieved because the page shells don't fetch.
- **Use `unstable_cache` instead of `revalidate`**: equivalent for our needs; `revalidate` is the documented public API and easier to read.

## Files added

- `docs/adr/0001-client-side-data-fetching.md`
- `components/ui/skeleton.tsx` (shadcn)
- `hooks/query-keys.ts`
- `app/api/v1/dashboard/route.ts`
- `app/api/v1/profile/route.ts`
- `components/dashboard/dashboard-view.tsx`
- `components/dashboard/dashboard-skeleton.tsx`
- `components/profile/profile-view.tsx`
- `components/profile/profile-skeleton.tsx`
- `app/(dashboard)/error.tsx`
- `app/(dashboard)/dashboard/error.tsx`
- `app/(dashboard)/profile/error.tsx`

## Files modified

- `app/(dashboard)/dashboard/page.tsx` — thin Suspense shell
- `app/(dashboard)/profile/page.tsx` — thin Suspense shell
- `components/dashboard/continue-studying-card.tsx` — invalidate `dashboard` key
- `components/dashboard/recent-deck-card.tsx` — invalidate `dashboard` key
- `components/profile/profile-settings-form.tsx` — invalidate `profile` key
- `app/api/v1/languages/route.ts` — `revalidate = 3600`
- `app/api/v1/topics/route.ts` — `revalidate = 3600`
- Various client components — use central `queryKeys` factory
