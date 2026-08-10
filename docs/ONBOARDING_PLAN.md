# Onboarding Flow — Implementation Plan

## Overview
A multi-step feature showcase modal that appears for new users on their first authenticated visit. Pure feature tour (no data collection), with a "Skip" and "Next/Get started" flow. Resumes mid-flow on refresh via localStorage-persisted Zustand store. Gated by a new `onboardedAt` DB column on `users`.

## Architecture Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Purpose | Feature showcase only | No profile data collection; pure welcome tour |
| Onboarded flag | `onboardedAt timestamp` on `users` | Read for free via `getCurrentUser()`; matches existing patterns |
| Mount point | `app/(dashboard)/layout.tsx` (server) | Covers all authenticated routes; server reads user row |
| Resume on refresh | Zustand + localStorage | Mirrors `stores/study-store.ts` persistence pattern |
| Backfill existing users | No | Leave `onboardedAt = null` for existing users; everyone sees the tour once |

## Showcase Steps (content)
Each step = a slide with an icon/illustration, title, and short description. Proposed 6 steps:

1. **Welcome** — "Welcome to FlashForge" — brand intro, what the app does (learn vocab with flashcards).
2. **Decks** — "Create & manage flashcard decks" — build your own, import, or fork from community.
3. **Study** — "Study sessions that stick" — flip cards, self-grade, spaced practice.
4. **Gamification** — "Earn XP & build streaks" — XP per review, daily streaks with multipliers.
5. **Collections** — "Organize with collections" — group related decks.
6. **Explore** — "Discover community decks" — browse public decks, study as guest or fork.
7. **Ready** — "You're all set" — "Get started" button → marks onboarded & closes.

> Step content/icons can be tuned; this is the standard feature-tour shape.

## File Changes

### 1. Schema (requires migration)
- **`lib/db/schema.ts`** — add to `users` table:
  ```ts
  onboardedAt: timestamp("onboarded_at", { mode: "date" }), // null = not onboarded
  ```
- Run `pnpm db:generate` then `pnpm db:migrate` (per AGENTS.md, schema changes must be applied locally before use).
- **No backfill** — existing users stay `null`, so everyone sees the tour once.

### 2. API — mark onboarded
- **`app/api/v1/users/me/route.ts`** — extend `PATCH` Zod schema to accept `onboarded: z.literal(true).optional()`. When present, set `onboardedAt: sql\`now()\``. Reuse existing endpoint (already invalidates nothing client-side; client invalidates `queryKeys.me()`).
  - Alternative: dedicated `POST /api/v1/users/me/onboard` — but extending PATCH is simpler and consistent.

### 3. Constants
- **`lib/constants.ts`** — add `ONBOARDING` block:
  ```ts
  export const ONBOARDING = {
    STORAGE_KEY: "ff-onboarding",
    STEPS: ["welcome","decks","study","gamification","collections","explore","ready"] as const,
  } as const;
  export type OnboardingStep = (typeof ONBOARDING.STEPS)[number];
  ```

### 4. Zustand store (resume on refresh)
- **`stores/onboarding-store.ts`** — mirror `stores/study-store.ts` persistence:
  - State: `stepIndex: number`, `isOpen: boolean`, `hasStarted: boolean`.
  - Actions: `start()`, `next()`, `prev()`, `goTo(index)`, `skip()`, `complete()`, `reset()`.
  - Persist `stepIndex` + `hasStarted` to `localStorage` under `ONBOARDING.STORAGE_KEY` (manual persistence like study-store, or Zustand `persist` middleware — study-store uses manual; match it).
  - Export via **`stores/index.ts`** barrel.

### 5. Components (new folder `components/onboarding/`)
Type-based organization per AGENTS.md. Files:
- **`onboarding-dialog.tsx`** — controlled `<Dialog open onOpenChange>` (no `DialogTrigger`; open state from store). Uses `components/ui/dialog.tsx`. Renders current step via `AnimatePresence` + `motion.div` (framer-motion, honoring `useReducedMotion` — pattern from `components/study/study-frame.tsx`).
- **`onboarding-step.tsx`** — presentational step component (icon, title, description, step indicator dots).
- **`onboarding-progress.tsx`** — step dots / progress bar (e.g. shadcn `progress` or custom dots).
- **`onboarding-gate.tsx`** — client component receiving `onboarded: boolean` prop; on mount, if `!onboarded` calls `store.start()` to open the modal. Renders `<OnboardingDialog />`.
- **`index.ts`** — barrel export.

### 6. Mount point (server)
- **`app/(dashboard)/layout.tsx`** — currently renders `<DashboardShell>{children}</DashboardShell>`. Add:
  ```tsx
  const user = await getCurrentUser();
  // ...existing shell
  {!user?.onboardedAt && <OnboardingGate onboarded={false} />}
  ```
  - `OnboardingGate` is a client component (`"use client"`) so it can use the Zustand store.
  - Only renders when `onboardedAt` is null; zero overhead for onboarded users.

### 7. Completion flow
- On "Get started" (final step) or "Skip": `PATCH /api/v1/users/me` with `{ onboarded: true }`.
- On success: `queryClient.invalidateQueries({ queryKey: queryKeys.me() })` (pattern from `components/profile/profile-settings-form.tsx:142-143`), `store.complete()` (closes modal, clears localStorage).
- On error: keep modal open, show inline error (toast or message).

## Query Keys
- **`hooks/query-keys.ts`** — no new key strictly needed (reuse `me()`), but optionally add `onboarding()` if you cache onboarding server state. For showcase-only, `me()` suffices.

## Styling
- Dialog uses Tailwind 4 tokens: `bg-popover`, `text-popover-foreground`, `text-muted-foreground`, accent `text-ember`/`bg-ember/10` (matches existing dialogs).
- Step transitions: `AnimatePresence` with `mode="wait"`, fade/slide (respect `useReducedMotion`).
- Icons from `lucide-react` (Sparkles, Layers, GraduationCap, Flame, FolderOpen, Compass, Rocket).

## Edge Cases
- **Webhook race**: `requireCurrentUser` self-heals the user row; `getCurrentUser` may return null on first load if webhook hasn't fired — gate handles `user === null` gracefully (don't show onboarding until row exists).
- **Already onboarded users**: existing users have `onboardedAt = null` after migration. Decision: leave them null, so everyone sees the tour once.
- **Skip vs complete**: both mark `onboardedAt` (skip = "don't show again"; complete = "finished tour"). Same DB write.
- **localStorage cleanup**: on `complete()`/`skip()`, clear the persisted step so a future re-onboarding (if ever needed) starts fresh.

## Migration Notes
- After editing `lib/db/schema.ts`, run `pnpm db:generate` → `pnpm db:migrate`.
- **No backfill SQL** — existing users stay `null`.

## Testing
- Unit: `stores/onboarding-store.ts` (step transitions, persistence, reset).
- Integration: `PATCH /api/v1/users/me` with `onboarded: true` sets `onboardedAt`.
- E2E (Playwright, optional): new user lands on `/dashboard` → onboarding modal appears → step through → completes → modal gone on reload.

## Execution Order
1. Schema + migration (no backfill).
2. API PATCH extension.
3. Constants + Zustand store.
4. Onboarding components (dialog, step, progress, gate).
5. Mount in dashboard layout.
6. Lint + typecheck (`pnpm lint`, `tsc`).
7. Manual smoke test in dev.
