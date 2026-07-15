# FlashForge — Developer Guide

A vocabulary learning platform built around flashcard decks, study sessions, and gamification (XP and daily streaks). Users create decks organized by language pairs and topics, share them publicly, fork community decks, and track their progress.

- **Live demo:** https://flashforge.denyspupin.dev
- **Architecture:** see [`docs/PROJECT.md`](./PROJECT.md)
- **Deployment:** see [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md)
- **Tests:** see [`docs/TEST_PLAN.md`](./TEST_PLAN.md)

## Features

- **Decks organised by language pairs and topics** — source/target language enforced at the deck level, with cards inheriting the pair.
- **Public discovery and forking** — publish any deck or collection to the community feed; anyone can fork a public one to their own account.
- **Curated collections** — trusted curators publish featured collections highlighted on the platform.
- **Study sessions** — front-of-card reveal flow with Pass/Fail, summary screen with the missed list, resumable across visits.
- **Gamification** — XP awarded per session, daily streaks with multipliers, achievement unlocks.
- **Notifications** — fork events and achievement unlocks surfaced in-app.
- **Themes** — light, dark, and system preference, persisted per user.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Auth | Clerk (credentials + OAuth, Svix-verified webhook user sync) |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Server state | TanStack Query |
| UI state | Zustand |
| Validation | Zod |
| Hosting | Vercel + Neon (managed Postgres) |

## Project structure

```
flashforge/
├── app/
│   ├── (public)/            # Landing, explore, public deck/collection view
│   ├── (auth)/              # Clerk sign-in / sign-up
│   ├── (dashboard)/         # Authenticated app (decks, study, profile, history, notifications)
│   ├── admin/               # Admin tools (role-gated)
│   ├── api/v1/              # REST API
│   ├── api/webhooks/clerk/  # Svix-verified user sync
│   ├── layout.tsx
│   └── globals.css          # Tailwind 4 (CSS-first config — no tailwind.config.ts)
├── components/              # Type-organised: deck/, card/, study/, layout/, profile/, …
├── lib/
│   ├── db/                  # Drizzle schema + client
│   ├── api/                 # Response helper, error codes
│   ├── auth/                # Clerk helpers
│   ├── cache/               # Reference-data cache + revalidation
│   ├── queries/             # Server-side query functions (single source of truth for SQL)
│   ├── constants.ts         # XP values, streak multipliers, topics, languages
│   └── utils/
├── hooks/                   # Custom React hooks (incl. central `queryKeys`)
├── stores/                  # Zustand stores (study, theme)
├── types/                   # Shared TypeScript types
├── docs/                    # Project + deployment + test + release docs
├── scripts/                 # Seed scripts
├── drizzle/                 # Generated SQL migrations
└── tests/                   # Vitest suite (unit + integration)
```

## Getting started

### Prerequisites

- **Node** ≥ 20.18 (pinned in `package.json` `engines.node`; see `.nvmrc` for the exact version).
- **pnpm** 11+ (the repo declares `packageManager: pnpm@11.3.0`; use Corepack).
- **PostgreSQL 16** — or use the bundled `docker-compose.yml`.
- **Clerk** application (publishable + secret key, plus a webhook signing secret for `user.created` / `user.updated` / `user.deleted`).

### 1. Install dependencies

```bash
corepack enable
nvm use                  # picks up the pinned 22.13.0 from .nvmrc
pnpm install --frozen-lockfile
```

### 2. Configure environment

```bash
cp .env.example .env.local
cp tests/.env.test.example tests/.env.test
```

Fill in the Clerk placeholders in `.env.local` and the test webhook secret in `tests/.env.test`. Both files are gitignored. The default database URLs in the example files point at the local Docker Compose services.

### 3. Start the databases

```bash
docker compose up -d
```

This starts two services:

| Service | Port | Database | Storage |
| --- | --- | --- | --- |
| `postgres` | 5432 | `flashforge` (dev) | Named volume |
| `postgres_test` | 5433 | `flashforge_test` (tests) | `tmpfs` (disposable) |

The dev and test databases are intentionally separate. The dev database holds your real local data and is not backed up; the test database is wiped on every container restart.

### 4. Apply the schema

```bash
pnpm db:migrate         # dev database
pnpm db:migrate:test    # test database
```

`pnpm db:generate` produces a new migration from changes to `lib/db/schema.ts`; always review the generated SQL before committing.

### 5. Seed (optional)

```bash
pnpm db:seed            # languages + topics only
pnpm db:seed:mock       # users, decks, collections, sessions, achievements
pnpm db:seed:prompts    # prompt templates (active versions of deck- and collection-generation prompts)
```

Mock seed data is prefixed with `seed-` (decks) / `seed-coll-` (collections) / `mock_seed_` (Clerk IDs), so `pnpm db:seed:mock:reset` can wipe just the mock data without touching your own decks.

### 6. Start the dev server

```bash
pnpm dev
```

The app runs at <http://localhost:3000>.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Start the production server |
| `pnpm lint` | Run ESLint (`eslint .`) |
| `pnpm db:generate` | Generate a new migration from schema changes |
| `pnpm db:push` | Push the current schema (greenfield only) |
| `pnpm db:migrate` | Apply migrations to the dev database |
| `pnpm db:migrate:test` | Apply migrations to the test database |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:seed` | Seed reference data (languages, topics) |
| `pnpm db:seed:mock` | Seed mock users, decks, collections, sessions, achievements |
| `pnpm db:seed:mock:reset` | Wipe and re-seed the mock data |
| `pnpm db:seed:prompts` | Seed active prompt templates |
| `pnpm test` | Full Vitest suite |
| `pnpm test:unit` | Unit tests only |
| `pnpm test:integration` | Integration tests only (requires `flashforge_test` up + migrated) |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm test:coverage` | Vitest with coverage |

## API

REST API under `/api/v1`. All responses follow:

```json
{ "data": { ... }, "error": null }
```

Error codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `INTERNAL_ERROR`.

Highlights:

- `GET /community/decks` — browse public decks (filters: `source`, `target`, `topic`, `q`, `sort`)
- `GET /community/collections` — browse public collections
- `POST /decks` / `PATCH /decks/:id` / `DELETE /decks/:id` — manage own decks
- `POST /decks/:id/fork` — fork a public deck
- `POST /decks/:id/cards/bulk` — bulk add cards
- `GET /decks/:id/export` · `POST /decks/import` — deck interchange (format `flashforge.deck` v1.0)
- `POST /study` / `GET /study/:id` / `POST /study/:id/complete` / `POST /study/:id/abandon` — resumable sessions
- `GET /study/history` — past sessions
- `GET /notifications` / `PATCH /notifications/:id/read` / `PATCH /notifications/read-all` — in-app notifications
- `GET /dashboard` · `GET /profile` — dashboard and profile payloads (client-fetched; see ADR 0001)

Full endpoint table and database schema live in [`docs/PROJECT.md`](./PROJECT.md).

## Conventions

- Type-based component organisation (`components/deck/`, `components/card/`, …)
- shadcn/ui primitives in `components/ui/`
- Custom hooks in `hooks/`, Zustand stores in `stores/`
- Tailwind 4 with CSS-first config — no `tailwind.config.ts`; theme tokens live in `app/globals.css` under `@theme inline`
- ESLint flat config in `eslint.config.mjs`; `pnpm lint` runs `eslint .`
- All tables include `created_at` and `updated_at`
- UUIDs for decks, cards, sessions, collections, and prompt templates (future-proof for import/export)
- UTC timestamps on the server; client renders in local time
- Centralised `queryKeys` factory in `hooks/` for TanStack Query

## Safety rules

- **Never run destructive SQL against the dev database** unless the owner explicitly asks in the same message. The dev database is the only copy of the user's local data and is not backed up. All destructive operations during debugging, testing, or exploration must target `flashforge_test`.
- **Never edit `node_modules/`.** Use `pnpm` overrides or upstream fixes.

See [`AGENTS.md`](../AGENTS.md) for the agent-facing summary of the rules above.

## License

[MIT](../LICENSE) — see the file for full text.
