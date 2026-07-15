# FlashForge — Project Documentation

## Overview

FlashForge is a vocabulary learning platform for building, sharing, and studying flashcard decks. Users compose decks organised by language pair and topic, share them publicly, fork community decks into their own account, and track their progress through XP, daily streaks, and achievements.

The product is built on Next.js 16 (App Router) with a Postgres + Drizzle backend, Clerk for authentication, and a thin client-state layer (TanStack Query + Zustand) on top of React 19.

- **Live demo:** https://flashforge.denyspupin.dev
- **Source:** https://github.com/denyspupin/flashforge
- **Stack:** Next.js 16, React 19, PostgreSQL 16, Drizzle ORM, Clerk, Tailwind 4, shadcn/ui, TanStack Query, Zustand, Zod
- **Hosting:** Vercel (app) + Neon (Postgres)

See [`DEVELOPER.md`](./DEVELOPER.md) for local setup, [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the production runbook, and [`PUBLIC_RELEASE_PLAN.md`](./PUBLIC_RELEASE_PLAN.md) for the release-readiness checklist.

---

## Architecture at a glance

```
                 ┌───────────────────────────┐
                 │      Browser (React 19)   │
                 │  ┌────────────────────┐   │
                 │  │  Server components │   │ ─── Suspense shells for /dashboard, /profile
                 │  └────────────────────┘   │
                 │  ┌────────────────────┐   │
                 │  │  TanStack Query    │   │ ─── REST endpoints under /api/v1
                 │  │  Zustand (UI)      │   │
                 │  └────────────────────┘   │
                 └─────────────┬─────────────┘
                               │ HTTPS (server actions + fetch)
                 ┌─────────────▼─────────────┐
                 │   Next.js (Vercel)         │
                 │   proxy.ts → Clerk JWT     │
                 │   /api/v1/*                │
                 └─────────────┬─────────────┘
                               │ pg over TLS (pooled)
                 ┌─────────────▼─────────────┐
                 │   Postgres (Neon)          │
                 │   Drizzle migrations       │
                 └───────────────────────────┘
                               ▲
                 ┌─────────────┴─────────────┐
                 │   Clerk (Svix webhook)     │
                 │   user.created → /api/...  │
                 └───────────────────────────┘
```

### Boundary between public and authenticated routes

Defined in [`proxy.ts`](../proxy.ts). Routes outside this list are protected by `auth.protect()`:

| Public route | Why |
| --- | --- |
| `/` | Landing page |
| `/explore/*` | Community discovery |
| `/login/*`, `/register/*` | Clerk-hosted auth UI |
| `/api/v1/languages`, `/api/v1/topics` | Reference data |
| `/api/v1/community/*` | Public deck and collection reads |
| `/api/webhooks/clerk` | Svix-verified user sync |

Everything else requires a Clerk session.

### Why a thin server-state layer

- **TanStack Query** owns every remote fetch: cache, background refetch, mutation invalidation, optimistic updates.
- **Zustand** owns client-only state: study session progress, theme, transient UI.
- Server components stay as thin Suspense shells for `/dashboard` and `/profile` — they do not run queries themselves. See [ADR 0001](./adr/0001-client-side-data-fetching.md) for the rationale.

---

## Core features

### Decks

- Each deck specifies a **language pair** (`source` → `target`) and any number of topics.
- Cards inherit the deck's language pair — there is no per-card language override.
- Visibility is `private` (default) or `public`. Public decks appear in `/explore` and can be forked by any authenticated user.
- Decks can be marked `is_curated` by admins; curated decks are highlighted in the community feed.
- `forked_from_deck_id` records lineage; the UI does not surface the source.

### Collections

- A collection is a **thematically grouped bundle of decks** that share a language pair.
- The collection has its own visibility, slug, and (optional) `is_curated` flag.
- Forking a collection creates a new private collection with copies of every member deck.
- A user who forks a collection sends a `collection_fork_received` notification to the original author.

### Study sessions

- `POST /api/v1/study` creates a session (or returns the existing active one for the same deck + user).
- `GET /api/v1/study/:id` resumes — the player restores position from local storage.
- `POST /api/v1/study/:id/complete` writes the result, awards XP, updates streak, and may unlock achievements.
- `POST /api/v1/study/:id/abandon` marks the session `abandoned`. A fresh start is allowed.
- The Zustand study store persists position to `localStorage` so a tab close mid-session resumes at the same card on return.

### Gamification

- **XP** is awarded on session completion. Sources: per-card reviewed, per-card correct, deck-complete bonus, deck-perfect bonus, and a streak multiplier. Constants live in [`lib/constants.ts`](../lib/constants.ts).
- **Streaks** are derived server-side from `users.streak` and `users.streak_updated_at`. The multiplier table is `STREAK_MULTIPLIERS` in the same file. Server uses UTC; client renders in the user's local time.
- **Achievements** are seeded from `MOCK_ACHIEVEMENTS` in `scripts/seed-mock.ts`. Each achievement has a `condition_type` (e.g. `deck_complete_count`, `streak_days`, `language_pair_count`) and a `condition_value` JSON payload. Unlocks append a row to `user_achievements` and emit a `achievement_unlocked` notification.

### Notifications

Three notification types live in the `notification_type` enum: `fork_received`, `collection_fork_received`, `achievement_unlocked`. The dashboard notifications feed reads, marks-read, and bulk-marks-read against `/api/v1/notifications`.

### Roles, bans, and soft deletes

- The `role` enum is `user | curator | admin`. Roles gate admin routes (collections, decks, languages, topics, prompts, users, stats) and admin-only mutations.
- `is_banned` hides a user's content from public surfaces without deleting data.
- Most content tables (`users`, `decks`, `cards`, `languages`, `topics`, `collections`, `prompt_templates`) have a `deleted_at` column. Soft-delete is preferred over hard delete so user-generated content can be recovered. The admin tools support a "restore" route per resource.

### Themes

- The `theme` enum is `light | dark | system`. Default is `system`.
- The user's preference is read from a cookie server-side and applied before paint via `ThemeInitScript`. Subsequent navigations swap the class on `<html>`.

### Prompt templates (admin)

- `prompt_templates` stores versioned, soft-deletable prompt bodies used by the deck- and collection-generation AI flows.
- The unique-active constraint (`prompt_templates_active_slug_idx`) ensures only one version per `slug` is active at a time.
- Admins activate a new version via `POST /api/v1/admin/prompts/:id/activate`. The public read endpoint is `GET /api/v1/prompts/active`.

### Import / export

- Decks: `GET /api/v1/decks/:id/export` produces a JSON document under the `flashforge.deck` format (v1.0). `POST /api/v1/decks/import` accepts the same shape and either appends to an existing deck (matching language pair) or creates a new one. Capped at 1,000 cards per import.
- Collections: same idea, capped at 20 decks and 2,000 cards per import (`flashforge.collection` format).
- Foreign language pairs and oversized payloads are rejected with `400 VALIDATION_ERROR`.

---

## Database schema

Tables are defined in [`lib/db/schema.ts`](../lib/db/schema.ts). All tables have `created_at` and `updated_at`. UUIDs are used for decks, cards, study sessions, collections, and prompt templates (future-proofing import/export).

```
users
├── id                  UUID
├── clerk_id            VARCHAR(256) UNIQUE
├── name, avatar_url
├── native_language_id  → languages.id
├── xp, streak
├── streak_updated_at
├── role                user | curator | admin
├── theme               light | dark | system
├── is_banned
├── deleted_at
├── created_at, updated_at

languages
├── id, name, code (UNIQUE)
├── deleted_at
├── created_at, updated_at

topics
├── id, name, slug (UNIQUE)
├── deleted_at
├── created_at, updated_at

decks
├── id, title, slug
├── description
├── visibility          private | public
├── source_language_id  → languages.id
├── target_language_id  → languages.id
├── creator_id          → users.id
├── is_curated
├── forked_from_deck_id → decks.id (set null on delete)
├── deleted_at
├── created_at, updated_at

deck_topics
├── deck_id  → decks.id   (cascade)
├── topic_id → topics.id  (cascade)
├── created_at

cards
├── id, deck_id → decks.id (cascade)
├── front, back
├── times_reviewed, times_correct
├── last_reviewed_at
├── deleted_at
├── created_at, updated_at

study_sessions
├── id, user_id, deck_id
├── status        active | completed | abandoned
├── started_at, completed_at
├── cards_reviewed, cards_correct
├── failed_card_ids   JSONB
├── xp_awarded
├── created_at, updated_at

achievements
├── id, name, description
├── xp_value
├── condition_type, condition_value (JSONB)
├── created_at, updated_at

user_achievements
├── user_id, achievement_id
├── awarded_at
├── created_at
-- composite PK on (user_id, achievement_id)

notifications
├── id, user_id
├── type  fork_received | achievement_unlocked | collection_fork_received
├── data  JSONB
├── read
├── created_at, updated_at

collections
├── id, title, slug, description
├── visibility        private | public
├── creator_id        → users.id
├── source_language_id, target_language_id
├── is_curated
├── forked_from_collection_id → collections.id (set null on delete)
├── deleted_at
├── created_at, updated_at

collection_decks
├── collection_id → collections.id (cascade)
├── deck_id       → decks.id (cascade)
├── position
├── created_at
-- composite PK on (collection_id, deck_id)

prompt_templates
├── id, slug, version
├── body, description, changelog
├── is_active
├── created_by_id → users.id (set null on delete)
├── deleted_at
├── created_at, updated_at
-- unique (slug, version) where deleted_at IS NULL
-- unique (slug)           where is_active AND deleted_at IS NULL
```

**Notes**

- Deck deletion cascades to cards and study sessions.
- Collection deletion cascades to its `collection_decks` rows (not the underlying decks).
- Language and topic soft-delete cascades to dependent decks/collections so a rename does not orphan data.

---

## API surface (REST, under `/api/v1`)

All responses follow the standard envelope:

```json
{ "data": { ... }, "error": null }
```

Error codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `INTERNAL_ERROR`. See [`AGENTS.md`](../AGENTS.md) for the full table.

### Public (no auth)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/languages` | Cached `revalidate=3600`. |
| GET | `/topics` | Cached `revalidate=3600`. |
| GET | `/community/decks` | Filters: `source`, `target`, `topic`, `q`, `sort`. |
| GET | `/community/decks/:id` | Public deck + cards. |
| GET | `/community/topics/:id/decks` | Public decks by topic. |
| GET | `/community/collections` | Public collections. |
| GET | `/community/collections/:id` | Public collection + member decks. |
| GET | `/prompts/active` | Active prompt body for a given slug. |

### Authenticated — user

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/users/me` | Current user profile. |
| PATCH | `/users/me` | Update name, avatar, native language, theme. |
| GET | `/decks` | Caller's own decks. |
| POST | `/decks` | Create deck. |
| GET | `/decks/:id` | Own deck + cards. |
| PATCH | `/decks/:id` | Update. Re-derives slug on title change. |
| DELETE | `/decks/:id` | Cascade. |
| POST | `/decks/:id/publish` | Make public. |
| POST | `/decks/:id/unpublish` | Make private. |
| POST | `/decks/:id/fork` | Fork a public deck to caller's account. |
| POST | `/decks/:id/cards` | Add a card. |
| POST | `/decks/:id/cards/bulk` | Bulk add. |
| PATCH | `/decks/:id/cards/:cardId` | Update a card. |
| DELETE | `/decks/:id/cards/:cardId` | Delete a card. |
| GET | `/decks/:id/export` | JSON export (`flashforge.deck` format). |
| POST | `/decks/import` | Import (new deck or append to existing). |
| GET | `/collections` | Caller's own collections. |
| POST | `/collections` | Create collection. |
| GET | `/collections/:id` | Own collection + decks. |
| PATCH | `/collections/:id` | Update. |
| DELETE | `/collections/:id` | Delete. |
| POST | `/collections/:id/publish` | Make public. |
| POST | `/collections/:id/unpublish` | Make private. |
| POST | `/collections/:id/fork` | Fork a public collection. |
| POST | `/collections/:id/decks` | Add a deck to a collection. |
| POST | `/collections/:id/decks/bulk` | Bulk add decks. |
| DELETE | `/collections/:id/decks/:deckId` | Remove a deck. |
| GET | `/collections/import` | (See source — collection export shape) |
| POST | `/collections/import` | Import. |
| POST | `/study` | Start (or resume) a session. |
| GET | `/study/:id` | Read session. |
| POST | `/study/:id/complete` | Submit results, award XP. |
| POST | `/study/:id/abandon` | Mark `abandoned`. |
| GET | `/study/history` | Past sessions. |
| GET | `/notifications` | Caller's notifications. |
| PATCH | `/notifications/:id/read` | Mark one read. |
| PATCH | `/notifications/read-all` | Mark all read. |
| GET | `/dashboard` | Dashboard payload (XP, streak, recent decks, continue-studying). |
| GET | `/profile` | Profile payload. |

### Admin (role-gated)

| Resource | Paths |
| --- | --- |
| Users | `/admin/users`, `/admin/users/:id`, `/admin/users/:id/restore` |
| Languages | `/admin/languages`, `/admin/languages/:id`, `/admin/languages/:id/restore` |
| Topics | `/admin/topics`, `/admin/topics/:id`, `/admin/topics/:id/restore` |
| Decks | `/admin/decks`, `/admin/decks/:id`, `/admin/decks/:id/restore` |
| Collections | `/admin/collections`, `/admin/collections/:id`, `/admin/collections/:id/decks/:deckId`, `/admin/collections/:id/restore` |
| Prompts | `/admin/prompts`, `/admin/prompts/:id`, `/admin/prompts/:id/activate`, `/admin/prompts/:id/restore` |
| Stats | `/admin/stats` |

### Webhooks

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/webhooks/clerk` | Svix-verified. Subscribes to `user.created`, `user.updated`, `user.deleted`. |

---

## Auth & user sync

- **Clerk** handles credentials, OAuth, sessions, and email.
- The webhook handler at `app/api/webhooks/clerk/route.ts` verifies the Svix signature against `CLERK_WEBHOOK_SECRET` and upserts the user into the local `users` table.
- **Lazy fallback:** if a webhook is missed, the first authenticated API call resolves the user from `clerk_id` and creates the row on demand. Both paths converge on `lib/auth/user.ts`.

---

## Validation

Every request body and query string is parsed through Zod. Schemas live alongside the route handlers. Type inference is shared between the API and the client (the client re-uses the inferred types in `types/` and `hooks/`).

---

## Out of scope (v1)

- Ranks / levels (XP thresholds with visible tiers)
- Rich card fields (images, audio, example sentences, hints)
- Leaderboards, real-time, collaborative study
- Mobile native apps (the REST API is mobile-shaped)
- E2E browser tests
- Per-Vercel-preview Neon branching (current setup shares prod for simplicity)

---

## See also

- [`DEVELOPER.md`](./DEVELOPER.md) — local development, scripts, project structure
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — production runbook (Vercel + Neon + Clerk + Cloudflare)
- [`TEST_PLAN.md`](./TEST_PLAN.md) — what is and isn't tested, and how to run the suite
- [`PUBLIC_RELEASE_PLAN.md`](./PUBLIC_RELEASE_PLAN.md) — release-readiness checklist
- [`AGENTS.md`](../AGENTS.md) — agent-facing conventions
- [`adr/0001-client-side-data-fetching.md`](./adr/0001-client-side-data-fetching.md) — why `/dashboard` and `/profile` are client-fetched
