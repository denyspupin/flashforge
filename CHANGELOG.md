# Changelog

All notable changes to FlashForge are recorded here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) as of the first public release.

## [Unreleased]

### Added
- Public landing page metadata (title template, OpenGraph, Twitter, canonical, robots).
- Branded 404 (`app/(public)/not-found.tsx`, `app/not-found.tsx`) and a root error boundary (`app/error.tsx`, `app/global-error.tsx`).
- `app/robots.ts` and `app/sitemap.ts` for SEO.
- `app/opengraph-image.tsx` — dynamic 1200×630 Open Graph image (Edge runtime).
- `.nvmrc` pinning Node 22.13.0; `package.json` `engines.node: ">=20.18.0"`.
- `docker-compose.yml` second service `postgres_test` (port 5433, `tmpfs`) for disposable test databases.
- `pnpm db:migrate:test` script and `drizzle.config.ts` fallback to `TEST_DATABASE_URL` so test migrations work without a dev `DATABASE_URL`.
- GitHub workflows: `.github/workflows/ci.yml` (lint + build + unit + integration against a disposable Postgres 16 service), `.github/workflows/audit.yml` (weekly `pnpm audit`), `.github/workflows/secret-scan.yml` (gitleaks on PRs and `main`).
- Issue templates (`.github/ISSUE_TEMPLATE/bug_report.yml`, `feature_request.yml`, `question.yml`) and a pull request template.
- Open-source governance: `LICENSE` (MIT), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`.
- Dependabot configuration for npm, GitHub Actions, and Docker.
- `docs/PUBLIC_RELEASE_PLAN.md` (the release-readiness checklist this PR resolves).

### Changed
- `package.json` — added `description`, `license`, `homepage`, `repository`, `bugs`, `engines.node`; `shadcn` moved from `dependencies` to `devDependencies` (it is a scaffolder, not a runtime dependency).
- `README.md` — rewritten as the public landing page: live demo URL (`https://flashforge.denyspupin.dev`), MIT badge, full feature list, stack, local setup, contributing and security links. Removed the stale "One retry round" claim (the auto-retry pass was removed in `19dca5e`; the study summary screen now lists missed cards).
- `docs/PROJECT.md` — rewritten from the current schema: collections, prompt templates, achievements, roles, bans, soft deletes, themes, full API table.
- `docs/DEVELOPER.md` — pinned Node version, two-database Docker Compose, full script table, public-vs-auth route boundary.
- `docs/TEST_PLAN.md` — `TEST_DATABASE_URL` referenced consistently; CI plan updated; new integration test files for collections documented.
- `tests/.env.test.example` — switched from `DATABASE_URL` to `TEST_DATABASE_URL` to match `tests/setup/db.ts`.
- `.env.example` — replaced `pk_test_…` / `sk_test_…` / `whsec_…` placeholders with `pk_test_replace_me` / `sk_test_replace_me` / `whsec_replace_me` to make it obvious they need real values; added `NEXT_PUBLIC_APP_URL`.

### Removed
- `scripts/apply-migration.mjs` — a one-off helper that hardcoded `drizzle/0007_*.sql`; the latest migration in the repo is `0007`, so the script is now obsolete and would silently no-op. Deleted from the worktree.

### Security
- Local secret scan and full `git log --all -p` scan for `sk_live_*`, `pk_live_*`, `whsec_*`, `postgres://…:…@…` connection strings, `VERCEL_TOKEN`, `GITHUB_TOKEN`, and Slack tokens: no findings.
- Dependency audit (`pnpm audit --prod`): 1 high-severity transitive (`hono` via `shadcn`) and 6 moderate resolved by moving `shadcn` to `devDependencies`. Remaining 1 moderate is transitive `postcss` via `next`; fixed upstream when `next` ships a patch.
- `gitleaks/gitleaks-action` bumped from `@v2` (Node 20, removed Sep 2026) to `@v3` (Node 24). `audit.yml` cron comment corrected — GitHub Actions cron runs in UTC, not Europe/London.

## Earlier

This changelog starts with the v0.1.0 release-prep. Earlier work is in the git history.
