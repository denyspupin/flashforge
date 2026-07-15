## What

<!-- One short paragraph: what this PR changes. -->

## Why

<!-- Link the issue, or describe the motivation. -->

## How

<!-- Implementation notes for the reviewer. Anything that surprised you. -->

## Checklist

<!-- Tick all that apply. -->

- [ ] I read [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`AGENTS.md`](./AGENTS.md)
- [ ] `pnpm lint` passes locally
- [ ] `pnpm build` passes locally
- [ ] `pnpm test` passes locally (unit + integration)
- [ ] I added tests for any behaviour I changed
- [ ] I updated docs (`README.md`, `docs/PROJECT.md`, `docs/DEVELOPER.md`, `docs/TEST_PLAN.md`) if behaviour, scripts, or API surface changed
- [ ] I did not commit any secrets, `.env*` files, or production data
- [ ] I did not touch `node_modules/`
- [ ] I did not run destructive SQL against the dev database
- [ ] If `lib/db/schema.ts` changed, I generated, reviewed, and committed the new migration in `drizzle/`

## Schema or migration changes

<!-- Leave blank if not applicable. -->

- [ ] No schema changes
- [ ] New migration generated and committed
- [ ] Migration reviewed for destructive operations
- [ ] `pnpm db:migrate:test` applied locally

## Screenshots

<!-- For UI changes, attach before/after. -->
