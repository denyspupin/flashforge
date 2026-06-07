## Project Overview

FlashForge is a vocabulary learning platform with flashcard decks, study sessions, and gamification (XP, streaks).

## Quick Facts

| Item    | Value                                                         |
| ------- | ------------------------------------------------------------- |
| Stack   | Next.js 15, PostgreSQL, Drizzle, Clerk, Tailwind + shadcn/ui |
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

- No comments in code unless required
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
