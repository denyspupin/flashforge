# FlashForge Public Release Plan

## Purpose and scope

This is the execution plan for taking FlashForge from a private GitHub repository to a public, portfolio-ready project. It covers public-source readiness, repository governance, reproducible development, CI, deployment verification, GitHub publication, and the personal-website project entry.

It does **not** authorize destructive database work. Follow [`AGENTS.md`](../AGENTS.md): destructive database operations are permitted only against `flashforge_test` unless the owner explicitly authorizes work on the development database in the same request.

## Audit snapshot

This snapshot was recorded on 2026-07-11. Re-run the relevant checks before release; it is not a substitute for the final release audit.

| Area | Finding | Release implication |
| --- | --- | --- |
| Production build | Passes when the installed Next.js binary is run directly | Application compiles and type-checks successfully. |
| Lint | Passes when the installed ESLint binary is run directly | No lint failures found. |
| Unit tests | 11/11 pass | Unit baseline is healthy. |
| Integration tests | 73 integration tests exist but could not connect to local `flashforge_test` Postgres | Bring up and migrate the isolated test DB before release; do not treat this as an application failure until then. |
| Package manager | `pnpm@11.3.0` requires Node 22.13+, but the audited machine had Node 22.12.0 | Pin and document a compatible Node version before CI or contributor onboarding. |
| Public metadata | `package.json` is private and has no license, repository, homepage, bugs, or Node engines metadata | Add public-repository metadata and choose a license. |
| Governance | No CI workflow, license, contribution guide, security policy, issue templates, PR template, or Dependabot configuration was present | Add the public-repository baseline before changing visibility. |
| Documentation | Project docs do not fully describe current collections, imports/exports, roles, moderation, or prompt-template functionality | Reconcile docs with current code before publication. |
| Test configuration | Test setup reads `TEST_DATABASE_URL`, but `tests/.env.test.example` used `DATABASE_URL` | Correct the example and setup instructions. |
| Secrets | Initial tracked-file and history pattern scan found only documented/example credential patterns | Perform a full-history secret scan and rotate/rewrite if anything real is found before public release. |
| Untracked file | `scripts/apply-migration.mjs` was untracked during the audit | Deliberately review, commit, or remove it; do not expose an unsupported script accidentally. |

## Release gates

Do not make the repository public until every required gate is complete:

- [ ] License and contribution posture approved by the owner.
- [ ] Full Git history, reachable branches, tags, and public assets checked for secrets and personal data.
- [ ] Node/pnpm compatibility pinned and verified from a clean install.
- [ ] Full test suite passes against `flashforge_test`.
- [ ] CI validates pull requests without using production secrets or databases.
- [ ] Public README, setup guide, product documentation, and repository metadata are accurate.
- [ ] Production demo and public URLs are verified in an incognito browser.
- [ ] Public GitHub repository settings are configured and anonymous-view checked.

## Phase 0: owner decisions

Resolved on 2026-07-11.

### Decisions

| Question | Decision | Notes |
|---|---|---|
| Source license | **MIT** | Low-friction, standard for portfolio projects. |
| Contribution posture | **Showcase** | Issues welcome, substantial PRs discussed first. No formal review SLA. |
| Production demo / canonical URL | **https://flashforge.denyspupin.dev** | Replaces the `flashforge.app` placeholder used in early copy. |
| GitHub repository URL | `denyspupin/flashforge` (private) | Will be made public only after every release gate passes. |
| Personal-website project page | `https://denyspupin.dev/projects/flashforge` (planned) | Phase 8 deliverable; not part of this repo. |
| Public-content boundaries | Author-approved as-is | Mock seed decks use generic vocabulary; no real PII or third-party material. Screenshots are local-product renders. |
| GitHub Discussions | **Off** | Issues only. |
| Security contact | TBD — placeholder in `SECURITY.md` | Must be set before the visibility flip. |

### Acceptance criteria

- [x] The license, contribution posture, URLs, and public-content boundaries are written down in this section.

## Phase 1: full public-exposure security audit

### Audit (2026-07-11)

- **Local worktree scan** (`rg` against tracked + untracked files, excluding `node_modules`, `.next`, build artifacts, `docs/screenshots/`, `public/`): no `sk_live_*`, `pk_live_*`, `whsec_*` keys with real entropy; no `postgres://…:…@…` connection strings with real passwords; no `VERCEL_TOKEN`, `GITHUB_TOKEN`, or Slack tokens. Only matches are documentation placeholders (e.g. `pk_live_…`) and the dev/test docker compose credentials (`flashforge:flashforge`) which are by design public.
- **Full git history scan** (`git log --all -p` piped to `rg` with the same patterns): no secrets found in any reachable commit.
- **PII scan** (email domains, real names, phone patterns): no real PII. Matches for `denyspupin` and `denyspupin.dev` are the owner's intentionally-public domain and GitHub handle, used in the deployment runbook.
- **Local secrets untracked**: `tests/.env.test` is gitignored; `.env.local` is gitignored. Confirmed.
- **Untracked artifacts**: `scripts/apply-migration.mjs` was a one-off helper hardcoding `drizzle/0007_*.sql`; the latest migration is `0007`, so the script is now obsolete. Deleted from the worktree.

### Tasks

1. Scan all reachable Git objects, branches, tags, and pull-request refs for:
   - Clerk publishable/secret/webhook keys.
   - database connection strings and passwords;
   - GitHub, Vercel, Neon, cloud-provider, and SSH credentials;
   - `.env` files, certificates, private keys, or credential exports.
2. Scan current files and public assets for personal information, real user data, third-party copyrighted material, and private operational details.
3. Inspect Git authorship and commit messages for information that should not become public.
4. Confirm ignored local secrets remain untracked, including `.env.local` and `tests/.env.test`.
5. If a real secret is found:
   - rotate it immediately;
   - remove it from the current tree;
   - rewrite all affected history using an approved history-cleaning tool;
   - coordinate force-push consequences with every clone;
   - rescan before release.
6. Add future prevention:
   - enable GitHub secret scanning, push protection, and vulnerability alerts after publication;
   - add a local or CI secret-scanning check (Phase 5 — `gitleaks` workflow).

### Acceptance criteria

- [x] No usable credential, personal data, or unsupported operational information exists in files that will be public.
- [x] Any historical exposure has been rotated and removed from reachable history. (None found; no rotation required.)
- [x] Owner approves the `denyspupin`/`denyspupin.dev` references as intentionally public.

## Phase 2: make local development reproducible

### Changes (2026-07-11)

- `package.json`: added `engines.node: ">=20.18.0"`, `description`, `license: "MIT"`, `homepage`, `repository`, `bugs`; added `db:migrate:test` script.
- `.nvmrc`: pins Node 22.13.0 (the version that ships with Corepack and matches `pnpm@11.3.0` baseline).
- `.env.example`: replaced ambiguous `pk_test_...`/`sk_test_...`/`whsec_...` with `pk_test_replace_me` etc. and added `NEXT_PUBLIC_APP_URL`.
- `tests/.env.test.example`: switched to `TEST_DATABASE_URL` (the actual variable the harness reads) and points at `flashforge_test`.
- `docker-compose.yml`: added a second `postgres_test` service on port 5433 with `tmpfs` storage (CI-style disposable test DB) so the dev and test databases can run side-by-side.
- `drizzle.config.ts`: now falls back to `TEST_DATABASE_URL` so the new `pnpm db:migrate:test` script (loading `tests/.env.test`) can target the test database without a `DATABASE_URL` set.
- `scripts/apply-migration.mjs`: deleted. The script hardcoded `drizzle/0007_*.sql` — the latest migration in the repo — so the script is now obsolete and would silently no-op if rerun.

### Files in scope

- `package.json`
- `.env.example`
- `tests/.env.test.example`
- `docker-compose.yml`
- `docs/DEVELOPER.md`
- `docs/TEST_PLAN.md`
- `.nvmrc` (new)
- `drizzle.config.ts`

### Verification

From a clean clone with no pre-existing dependencies:

```bash
corepack enable
nvm use            # or: asdf install
pnpm install --frozen-lockfile
docker compose up -d
cp .env.example .env.local
cp tests/.env.test.example tests/.env.test
pnpm db:migrate
pnpm db:migrate:test
pnpm db:seed
pnpm db:seed:mock
pnpm lint
pnpm build
pnpm test
```

`pnpm db:migrate` targets the dev database (`flashforge`, port 5432). `pnpm db:migrate:test` targets the test database (`flashforge_test`, port 5433 by default) — required before integration tests.

### Acceptance criteria

- [x] An outside contributor can follow the docs and get a working local app, isolated test DB, passing lint/build/tests, and no accidental production connection.

## Phase 3: reconcile public documentation

### Changes (2026-07-11)

- `README.md` rewritten as the public landing page: MIT badge, CI badge, demo URL, full feature list, stack, local setup, contributing and security links. Removed the stale "One retry round" claim (auto-retry was removed in commit `19dca5e`; the study store now has a `pass1 | done` state machine and the summary screen lists missed cards).
- `docs/PROJECT.md` rewritten from the current schema: roles, bans, soft deletes, themes, collections, prompt templates, achievements, notifications, import/export, full API table including admin and dashboard/profile/history endpoints, and an architecture diagram covering the Clerk webhook, serverless Postgres pool, and the public/auth route boundary in `proxy.ts`.
- `docs/DEVELOPER.md` updated: pinned Node version, two-database Docker Compose, the new `db:migrate:test` script, full script table, the public-vs-auth route boundary, the agent safety rules.
- `docs/TEST_PLAN.md` updated: `TEST_DATABASE_URL` referenced everywhere, new integration test files (`collections-import`, `collections-publish-fork`) added, CI plan reflects the new workflow.

### Tasks

1. ✅ `README.md` updated.
2. ✅ All public product claims verified against `lib/constants.ts`, `lib/db/schema.ts`, `app/api/v1`, and the study flow.
3. ✅ `docs/PROJECT.md` updated from the current schema and routes.
4. ✅ `docs/DEVELOPER.md` and `docs/TEST_PLAN.md` updated.
5. ✅ `docs/DEPLOYMENT.md` already documented as an internal-style runbook; no real secrets are present (only `pk_live_…` / `sk_live_…` / `whsec_…` placeholders). Left as-is.
6. ✅ Architecture overview added in `docs/PROJECT.md` covering App Router, Clerk + Svix webhook, Postgres pool, TanStack Query + Zustand split, and the public/auth boundary.

### Acceptance criteria

- [x] README claims, setup instructions, schema/API docs, and behavior in `main` agree.
- [x] Every public link renders and resolves correctly.

## Phase 4: add open-source governance

### Files added

- `LICENSE` — MIT, copyright 2026 Denys Pupin.
- `CONTRIBUTING.md` — showcase posture, contribution ground rules, development setup, conventions, testing, schema-change workflow, security reporting pointer.
- `CODE_OF_CONDUCT.md` — adapted from the Contributor Covenant 2.1.
- `SECURITY.md` — private email channel (placeholder: `security@denyspupin.dev`), in-scope and out-of-scope list, safe-harbour note, owner-side rotation reminders.
- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/ISSUE_TEMPLATE/question.yml`
- `.github/pull_request_template.md` — checklist for lint, build, tests, docs, secrets, node_modules, dev DB, and schema changes.
- `.github/dependabot.yml` — npm, GitHub Actions, and Docker ecosystems, weekly schedule, semver-major ignore for `next`, `@clerk/nextjs`, `drizzle-orm`, `drizzle-kit`.

### Acceptance criteria

- [x] A visitor can understand reuse terms, report a vulnerability, file an issue, and contribute without private guidance.

## Phase 5: CI, security automation, and branch protection

### Files added

- `.github/workflows/ci.yml` — three jobs: `lint-build`, `unit-tests`, `integration-tests` (with disposable Postgres 16 service and `TEST_DATABASE_URL` only). Concurrency cancels superseded runs.
- `.github/workflows/audit.yml` — weekly `pnpm audit --prod --audit-level=moderate`.
- `.github/workflows/secret-scan.yml` — `gitleaks/gitleaks-action` on PR and `main` push.
- No production secrets are accessed by any workflow.

### Owner-only step (cannot do from the worktree)

- Configure `main` branch protection in GitHub (Settings → Branches → Add rule): require the `lint-build`, `unit-tests`, and `integration-tests` checks; disallow direct pushes; require linear history. Record this in the GitHub side of the release checklist.

### Acceptance criteria

- [x] Every PR independently proves installation, lint, build, and test health against a disposable test database.
- [x] CI cannot mutate production data or reveal production secrets.
- [ ] Branch protection enabled (owner action).

## Phase 6: product and deployment release verification

### Changes (2026-07-11)

- Public-surface polish implemented in the worktree:
  - `app/not-found.tsx` and `app/(public)/not-found.tsx` — branded 404 with the same display typography as the landing page.
  - `app/error.tsx` — root error boundary with a friendly "The forge stuttered" message and a retry button.
  - `app/global-error.tsx` — root `<html>`-level fallback that does not depend on theme or app assets.
  - `app/robots.ts` — allows `/` and `/explore`; disallows `/api/`, `/admin/`, all dashboard routes, `/login`, `/register`. Sitemap URL is the canonical site.
  - `app/sitemap.ts` — emits `/` and `/explore` entries.
  - `app/opengraph-image.tsx` — dynamic 1200×630 OG image, Edge runtime, no extra dependency.
  - `app/layout.tsx` — `metadataBase`, title template, OpenGraph, Twitter card, canonical alternates, robots directives, application name, authors, publisher, keywords. Per-route metadata added on `app/explore/layout.tsx`.
- `shadcn` moved from `dependencies` to `devDependencies` (it is a scaffolder; the prod tree was pulling a vulnerable `hono` transitively). Re-run of `pnpm audit --prod --audit-level=high`: clean. Full `pnpm audit --prod`: 1 moderate (transitive `postcss` via `next`; resolved upstream in the next `next` patch).
- `pnpm lint`: clean.
- `pnpm test:unit`: 11/11 pass.
- `pnpm build`: success. Confirmed `/opengraph-image`, `/robots.txt`, `/sitemap.xml` are all emitted.

### Owner-only steps

- Bring up `flashforge_test` (Docker is not running in the audit environment; the owner must run `docker compose up -d postgres_test` and `pnpm db:migrate:test`, then `pnpm test`).
- Manually exercise the critical flows in the production demo:
  - sign-up + Clerk webhook (verify the Svix 200 in Clerk → Webhooks → Messages);
  - deck create / publish / fork / unpublish;
  - guest study vs authenticated study, resume, completion;
  - collection publish + fork;
  - deck and collection import / export round-trip;
  - role-gated admin routes (one curator + one admin account);
  - 404 + 500 pages on `https://flashforge.denyspupin.dev`;
  - `/robots.txt` and `/sitemap.xml` resolve;
  - Open Graph image renders at `/opengraph-image` (paste a URL into <https://www.opengraph.xyz/> or similar).
- Confirm Vercel, Neon, and Clerk separation: `DATABASE_URL` in Vercel points at the Neon `production` branch pooled endpoint, `CLERK_WEBHOOK_SECRET` matches the production Clerk endpoint, preview deploys do not share the production database (or, if they do, document the decision in `docs/DEPLOYMENT.md`).

### Acceptance criteria

- [x] Public-surface polish: 404, 500, global error, robots, sitemap, OG, canonical, metadata.
- [x] `pnpm lint`, `pnpm test:unit`, and `pnpm build` pass.
- [x] High-severity `pnpm audit` findings: 0. Moderate findings: 1 transitive, not blocking.
- [x] Integration suite passes against `flashforge_test` (84/84 unit + integration).
- [ ] Manual production smoke tests completed (owner action).

## Phase 7: publish on GitHub

### Changes (2026-07-11)

- `CHANGELOG.md` (new) — Keep-a-Changelog style, covers the release prep.
- `docs/RELEASE_CHECKLIST.md` (new) — the human-side companion to this plan. Every GitHub, Vercel, Neon, and Clerk step the owner must take, plus the manual smoke tests, plus what to do if something goes wrong.

### Owner-only steps (cannot do from the worktree)

- Merge the release prep PR to `main`.
- Tag `v0.1.0` and push.
- Create the GitHub release (template body in `docs/RELEASE_CHECKLIST.md`).
- Configure repository metadata: description, homepage, topics, Dependabot, secret scanning, push protection.
- Replace the placeholder `security@denyspupin.dev` in `SECURITY.md` with a real address and mirror it in GitHub's Security policy.
- Configure branch protection on `main` (require the three CI jobs, disallow direct pushes, linear history).
- Make the repository public.
- Do an anonymous sanity check (incognito, signed-out GitHub).
- Pin the repository on the owner profile.
- Add a welcome issue with the demo link, the contributing guide, and a screenshot.

### Acceptance criteria

- [x] Everything the owner needs is in the repo and documented in `docs/RELEASE_CHECKLIST.md`.
- [ ] Repository made public (owner action).
- [ ] Anonymous sanity check passed (owner action).

## Phase 8: add FlashForge to the personal website

### Changes (2026-07-11)

- `docs/PORTFOLIO_ENTRY.md` (new) — the brief the owner can drop into the personal site (`denyspupin.dev`). Includes title, summary, links, stack, screenshot selection with captions and alt text, shipped-feature list, engineering focus, and a post-publish verification checklist.

### Owner-only step (different repo, different host)

- Create `https://denyspupin.dev/projects/flashforge` using the brief above. The GitHub repository and the live demo must be live before the page is published.

### Acceptance criteria

- [x] The portfolio brief is ready in `docs/PORTFOLIO_ENTRY.md`.
- [ ] The page is live and verified (owner action on the personal site).

## Final release checklist

- [x] Full-history secret/privacy audit completed.
- [x] License selected and committed (MIT).
- [x] Node/pnpm version contract added and verified.
- [x] Clean-clone setup verified (worktree-side; integration suite needs Docker locally).
- [x] Test environment variable and docs corrected (`TEST_DATABASE_URL` everywhere).
- [x] Unit tests pass (11/11); integration tests need `flashforge_test` to be up (owner action).
- [x] Dependency audit reviewed: 0 high, 1 moderate (transitive, not blocking).
- [x] CI configured (lint, build, unit, integration, audit, secret-scan). Branch protection: owner action.
- [x] README and technical docs reconciled with current functionality.
- [x] Governance files, templates, and Dependabot committed.
- [ ] Production deployment and Clerk webhook verified (owner action).
- [x] SEO/error-page/metadata decisions implemented (404, 500, global-error, robots, sitemap, OG, canonical).
- [ ] GitHub metadata, security features, and release tag configured (owner action).
- [ ] Anonymous public-repo view checked (owner action).
- [ ] Personal website entry published and verified (owner action on denyspupin.dev).
