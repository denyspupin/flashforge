# FlashForge

A vocabulary learning platform built around flashcard decks, study sessions, and gamification (XP and daily streaks). Users create decks organized by language pairs and topics, share them publicly, fork community decks, and track their progress.

## Features

- **Decks organized by language pairs and topics** — source/target language enforced at the deck level, with cards inheriting the deck's pair.
- **Public discovery and forking** — publish any deck to the community feed; anyone can fork a public deck to their own account.
- **Curated collections** — trusted curators publish featured decks highlighted on the platform.
- **Study sessions** — front-of-card reveal flow with Pass/Fail, one retry round for failed cards, resumable across visits.
- **Gamification** — XP awarded per session, daily streaks with multipliers, achievement unlocks.
- **Notifications** — fork events and achievement unlocks surfaced in-app.

## Tech Stack

| Layer       | Technology                                      |
| ----------- | ----------------------------------------------- |
| Framework   | Next.js 15 (App Router)                         |
| Database    | PostgreSQL + Drizzle ORM                        |
| Auth        | Clerk (credentials + OAuth, webhook user sync)  |
| Styling     | Tailwind CSS + shadcn/ui                        |
| Server state| TanStack Query                                  |
| UI state    | Zustand                                         |
| Validation  | Zod                                             |
| Hosting     | Vercel                                          |

## Project Structure

```
flashforge/
├── app/
│   ├── (public)/           # Landing, explore, public deck view
│   ├── (auth)/             # Login, register
│   ├── (dashboard)/        # Authenticated app (decks, study, profile, notifications)
│   ├── api/v1/             # REST API
│   ├── layout.tsx
│   └── globals.css
├── components/             # Type-organized: deck/, card/, study/, layout/, profile/, notifications/, ui/
├── lib/
│   ├── db/                 # Drizzle schema + client
│   ├── api/                # Response helpers, error codes
│   ├── auth/               # Clerk helpers
│   ├── constants.ts        # XP values, streak multipliers, topics
│   └── utils/
├── hooks/                  # Custom React hooks
├── stores/                 # Zustand stores
├── types/                  # Shared TypeScript types
├── docs/                   # Full project documentation
└── scripts/                # DB init and seed scripts
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 11+
- PostgreSQL 16 (or use the bundled `docker-compose.yml`)
- A Clerk application (publishable + secret key)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy the example file and fill in real values:

```bash
cp .env.example .env.local
```

Required variables:

```env
DATABASE_URL=postgresql://flashforge:flashforge@localhost:5432/flashforge
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

`.env.local` is gitignored. Never commit secrets.

### 3. Start the database

```bash
docker compose up -d
```

Or point `DATABASE_URL` at any existing PostgreSQL instance (Neon, Supabase, local install, etc.).

### 4. Apply the schema

```bash
pnpm db:push
```

For production-style migrations, use `pnpm db:generate` and `pnpm db:migrate` instead.

### 5. Start the dev server

```bash
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Scripts

| Command           | Purpose                                        |
| ----------------- | ---------------------------------------------- |
| `pnpm dev`        | Start the Next.js dev server                   |
| `pnpm build`      | Production build                               |
| `pnpm start`      | Start the production server                    |
| `pnpm lint`       | Run ESLint via `next lint`                     |
| `pnpm db:push`    | Push the Drizzle schema to the dev database    |
| `pnpm db:generate`| Generate a new migration from schema changes   |
| `pnpm db:migrate` | Apply generated migrations                     |
| `pnpm db:studio`  | Open Drizzle Studio                            |

## API

REST API under `/api/v1`. All responses follow:

```json
{ "data": { ... }, "error": null }
```

Error codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `INTERNAL_ERROR`.

Highlights:

- `GET /community/decks` — browse public decks (filters: source, target, topic, q, sort)
- `POST /decks` / `PATCH /decks/:id` / `DELETE /decks/:id` — manage own decks
- `POST /decks/:id/fork` — fork a public deck
- `POST /decks/:id/cards/bulk` — bulk add cards
- `POST /study/start` / `GET /study/:sessionId` / `POST /study/:sessionId/complete` — resumable sessions
- `GET /notifications` / `PATCH /notifications/:id/read` — in-app notifications

Full endpoint table and database schema live in [`docs/PROJECT.md`](./docs/PROJECT.md).

## Conventions

- Type-based component organization (`components/deck/`, `components/card/`, etc.)
- shadcn/ui primitives in `components/ui/`
- Custom hooks in `hooks/`, Zustand stores in `stores/`
- All tables include `created_at` and `updated_at`
- UUIDs for decks, cards, and sessions (future import/export)
- UTC timestamps on the server; client renders in local time

See [`AGENTS.md`](./AGENTS.md) for the agent-facing summary.

## License

Private — not currently licensed for redistribution.
