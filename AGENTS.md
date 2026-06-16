## Project Overview

FlashForge is a vocabulary learning platform with flashcard decks, study sessions, and gamification (XP, streaks).

## Quick Facts

| Item    | Value                                                         |
| ------- | ------------------------------------------------------------- |
| Stack   | Next.js 16, React 19, PostgreSQL, Drizzle, Clerk, Tailwind 4 + shadcn/ui |
| State   | TanStack Query (server) + Zustand (UI)                        |
| Hosting | Vercel                                                        |

Full documentation: `docs/PROJECT.md`

## Key Decisions

- **Type-based component organization** (`components/deck/`, `components/card/`, etc.)
- **Hybrid API routes**: flat for simple resources, nested for complex (see `app/api/v1/`)
- **Cards inherit language pair from deck** — deck enforces consistency
- **Study sessions created on start** — resumable if user returns
- **Public decks visible to non-auth users** — auth required for tracking/forking
- **Clerk webhooks sync users** to local DB on `user.created`
- **UUID primary keys** for Decks, Cards, and Sessions (future-proof for import/export)
- **Zod validation** on all API inputs
- **UTC timestamps** on server; client renders in local time

## Code Conventions

- **Never edit or "fix" anything inside `node_modules/`** — it is managed by the package manager and changes are wiped on every install. If a 3rd-party dependency has a bug, use `pnpm` overrides, `pnpm patch`, or fork/upstream PRs — never patch the installed copy directly.
- No comments in code unless required
- ESLint flat config in `eslint.config.mjs` (replaces legacy `.eslintrc`); `pnpm lint` runs `eslint .`
- Tailwind 4 (CSS-first config) — no `tailwind.config.ts`; theme tokens live in `app/globals.css`
- shadcn/ui components in `components/ui/`
- Custom hooks in `hooks/`
- Zustand stores in `stores/`
- Drizzle schema in `lib/db/schema.ts`
- Constants in `lib/constants.ts`
- API response helper in `lib/api/response.ts`
- All tables have `created_at` and `updated_at`

## API Response Format

```typescript
{ data: {...}, error: null }
// or
{ data: [...], error: null }
// errors:
{ data: null, error: { message: "...", code: "ERROR_CODE" } }
```

### Error Codes

| Code | Meaning |
|------|---------|
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource does not exist |
| `VALIDATION_ERROR` | Invalid request body or params |
| `CONFLICT` | Resource already exists or state conflict |
| `INTERNAL_ERROR` | Unexpected server error |

## Development Commands

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# DB migrations (dev)
npx drizzle-kit push

# DB migrations (prod)
npx drizzle-kit migrate

# Generate migration
npx drizzle-kit generate
```

> **Schema changes must be applied locally before they're usable.** Whenever
> `lib/db/schema.ts` is edited, run `pnpm db:migrate` (or `pnpm db:push` in
> dev) so the new columns/tables exist in your database. Drizzle generates
> SQL against the current schema — if the DB is out of sync, every query
> touching the changed table will fail at runtime with a "column does not
> exist" error (e.g. `POST /api/v1/study` will break if `study_sessions`
> is missing a new column). The migration files live in `drizzle/`.
