# Contributing to FlashForge

Thanks for stopping by. FlashForge is a **showcase project** — it's primarily a portfolio piece by the owner, but issues and small fixes are welcome.

## Posture

- **Issues are open** for bug reports, small feature ideas, and questions about the codebase.
- **Substantial pull requests should be discussed first** in an issue. The owner reviews PRs without a guaranteed SLA, and large changes that don't match the project's direction may be declined.
- **Do not submit code that targets production.** Anything that touches the live database, Vercel, Neon, or Clerk must be reviewed and applied by the owner.

## Ground rules

1. Be respectful. The [Code of Conduct](./CODE_OF_CONDUCT.md) applies to every interaction here.
2. Don't add secrets. There is no scenario in which a real API key, webhook secret, or database password belongs in a PR. See [SECURITY.md](./SECURITY.md) for how to report a vulnerability.
3. Don't touch `node_modules/`. If a dependency has a bug, propose an upstream fix or a `pnpm` override — never patch an installed copy.
4. Don't add features the project doesn't need. Open an issue first.

## Development setup

The full local setup lives in [`docs/DEVELOPER.md`](./docs/DEVELOPER.md). The short version:

```bash
corepack enable
nvm use
pnpm install --frozen-lockfile
docker compose up -d
cp .env.example .env.local
cp tests/.env.test.example tests/.env.test
pnpm db:migrate
pnpm db:migrate:test
```

## Code conventions

The agent-facing rules in [`AGENTS.md`](./AGENTS.md) are the source of truth. Highlights:

- **Type-based component organisation** (`components/deck/`, `components/card/`, etc.)
- **No comments in code** unless the logic is genuinely non-obvious
- **ESLint flat config** — `pnpm lint` runs `eslint .`
- **Tailwind 4** with CSS-first config — no `tailwind.config.ts`; theme tokens live in `app/globals.css` under `@theme inline`
- **Zod** for all API input validation; types inferred from schemas
- **UTC timestamps** on the server; client renders in local time
- **All tables** have `created_at` and `updated_at`

## Testing

Every PR must keep the suite green. See [`docs/TEST_PLAN.md`](./docs/TEST_PLAN.md) for what is and isn't covered.

- `pnpm test:unit` — fast, in-process
- `pnpm test:integration` — requires `flashforge_test` to be up and migrated (`pnpm db:migrate:test`)
- `pnpm test` — both

Add tests for any behaviour you change. Tests assert contracts, not implementation; prefer stable expectations over exact XP arithmetic.

## Schema changes

If your change touches `lib/db/schema.ts`:

1. `pnpm db:generate` to produce a migration
2. Inspect `git diff drizzle/` — Drizzle is generally right, but always check destructive operations
3. Commit the SQL alongside the schema change
4. Note the migration in the PR description so reviewers can re-run `pnpm db:migrate:test` locally

Never edit a migration that has already been applied to a real database.

## Migrations safety

- The dev database is not backed up. Don't run destructive operations against `flashforge` without explicit owner approval in the same message.
- All destructive operations during testing and exploration must target `flashforge_test`.

## Submitting a pull request

1. Branch from `main`.
2. `pnpm lint && pnpm build && pnpm test` all pass locally.
3. The PR description explains *what* and *why*, links the issue, and flags any schema or migration changes.
4. Screenshots help for UI changes.
5. Be ready to iterate — review feedback is part of the process.

## Reporting a vulnerability

Please **do not** file a public issue. See [SECURITY.md](./SECURITY.md) for the private contact.
