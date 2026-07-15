# Release checklist

This document is the **human-side companion** to [`PUBLIC_RELEASE_PLAN.md`](./PUBLIC_RELEASE_PLAN.md). Everything in the repo (docs, code, governance files, CI) is in place. This file tracks the steps that only the owner can take from the GitHub, Vercel, Neon, and Clerk dashboards — and the manual verifications that no automation can do.

## Required before the visibility flip

These are gates. None of them is optional.

### 1. Repository and integration state

- [ ] Pull the latest `main` locally and confirm the worktree is clean.
- [ ] `pnpm install --frozen-lockfile` from a clean clone succeeds.
- [ ] `docker compose up -d` brings up both `postgres` and `postgres_test`.
- [ ] `cp .env.example .env.local`, `cp tests/.env.test.example tests/.env.test`, fill in real Clerk keys.
- [ ] `pnpm db:migrate && pnpm db:migrate:test` both succeed.
- [ ] `pnpm lint && pnpm build && pnpm test` all pass.

### 2. CI is green on `main`

- [ ] Merge the release prep PR to `main`.
- [ ] Wait for the `CI` workflow to run on `main` itself and confirm all three jobs (`lint-build`, `unit-tests`, `integration-tests`) pass.
- [ ] Confirm the `audit` workflow schedule is registered (Settings → Actions → scheduled workflows). It runs weekly on Mondays at 08:00 UTC (cron is UTC; not local time).
- [ ] Confirm the `secret-scan` workflow ran on the merge commit.

### 3. Branch protection

In GitHub → Settings → Branches → `main` rule:

- [ ] Require a pull request before merging.
- [ ] Require approvals: 0 (solo) or 1+ if you want a review even from yourself.
- [ ] Require status checks to pass before merging — select `lint-build`, `unit-tests`, `integration-tests`.
- [ ] Require linear history.
- [ ] Do not allow force pushes.
- [ ] Do not allow deletions.
- [ ] Apply rule to `main`.

### 4. Repository metadata

GitHub → Settings → General:

- [ ] Description: `A vocabulary learning platform with flashcard decks, study sessions, and gamification (XP, streaks).`
- [ ] Website: `https://flashforge.denyspupin.dev`
- [ ] Topics: `nextjs`, `react`, `typescript`, `postgresql`, `drizzle-orm`, `clerk`, `flashcards`, `language-learning`, `tailwindcss`, `tanstack-query`, `zustand`, `vercel`, `neon`

GitHub → Settings → Code security and analysis:

- [ ] Enable Dependabot security updates (Dependabot.yml is already in the repo).
- [ ] Enable Dependabot version updates.
- [ ] Enable secret scanning.
- [ ] Enable push protection (block commits that contain real secrets).
- [ ] Enable code scanning (CodeQL) — optional but recommended.

### 5. Security contact

- [ ] Edit `SECURITY.md` and replace `security@denyspupin.dev` with a real address that forwards to the owner.
- [ ] Set the same address in GitHub → Security → Policy → Security policy (this is the address GitHub uses for private vulnerability reports on the repo).

### 6. Issue hygiene

- [ ] Disable Discussions (the owner decision is "off for now"). Settings → General → Discussions: unchecked.
- [ ] Confirm the three issue templates (`.github/ISSUE_TEMPLATE/bug_report.yml`, `feature_request.yml`, `question.yml`) appear in the "New issue" picker.
- [ ] Pin a welcome issue with a link to the live demo, the contributing guide, and a screenshot.

### 7. Tag and release

- [ ] From `main`, create the tag: `git tag -a v0.1.0 -m "First public release"`.
- [ ] Push: `git push origin v0.1.0`.
- [ ] GitHub → Releases → Draft a new release → choose `v0.1.0` → use the body below as a starting point.

#### Release body (suggested)

```markdown
# FlashForge v0.1.0

The first public release of FlashForge — a vocabulary learning workshop built around flashcard decks, study sessions, and a daily-streak XP loop.

**Live demo:** https://flashforge.denyspupin.dev
**Docs:** https://github.com/denyspupin/flashforge/tree/main/docs

## Stack

Next.js 16, React 19, PostgreSQL 16, Drizzle ORM, Clerk, Tailwind CSS 4, shadcn/ui, TanStack Query, Zustand, Zod. Hosted on Vercel with Neon Postgres.

## Features

- Decks organized by language pairs and topics, with cards inheriting the deck's pair.
- Public discovery and forking for both decks and collections.
- Guest study (no account required) with seamless sign-in upgrade.
- Resumable study sessions: start, walk away, come back to the same card.
- XP and streak multipliers (×1 → ×3 over 30 days) with a "sentence, not a chain" streak philosophy.
- Achievements (First Steps, Perfect Score, Week Warrior, Polyglot, Deck Master, Card Collector, Topic Explorer, Fork Star).
- In-app notifications for fork events and achievement unlocks.
- Light, dark, and system theme.
- Deck and collection import / export (`flashforge.deck` and `flashforge.collection` formats).
- Admin tools for content moderation (soft delete + restore), prompt template management, and platform stats.
- Branded 404 and 500 pages, robots.txt, sitemap.xml, Open Graph image, and per-route canonical URLs.

## Local setup

See [DEVELOPER.md](https://github.com/denyspupin/flashforge/blob/main/docs/DEVELOPER.md) — under five minutes from a clean clone.

## Known limitations

- No E2E browser tests yet. The integration suite covers the high-value API contracts (study completion math, fork/import, content moderation). See [TEST_PLAN.md](https://github.com/denyspupin/flashforge/blob/main/docs/TEST_PLAN.md).
- Preview deployments share the production database by default. See the [deployment runbook](https://github.com/denyspupin/flashforge/blob/main/docs/DEPLOYMENT.md) for how to separate them.
- The first sign-in is slow (~500ms cold start) on the free Neon tier.

## License

[MIT](https://github.com/denyspupin/flashforge/blob/main/LICENSE).
```

### 8. Make the repository public

- [ ] Settings → General → Danger Zone → "Change repository visibility" → "Make public". Confirm.
- [ ] Immediately do an anonymous sanity check: open an incognito window, sign out of GitHub, and visit the repo URL. Confirm:
  - the README renders, including the logo and screenshots;
  - all badges resolve (CI badge, license badge);
  - the file tree is what you expect;
  - the LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, and CHANGELOG files are present and link correctly;
  - clicking "Code" shows the default branch is `main`;
  - the latest release tag `v0.1.0` is visible.
- [ ] Pin the repository on your profile (Profile → Pin → select this repo).

## Manual production smoke tests

Run in an incognito window on `https://flashforge.denyspupin.dev`. Tick each box as you complete it.

- [ ] Landing page loads, no console errors, hero image visible.
- [ ] `/explore` renders the public library.
- [ ] `/robots.txt` resolves and shows the rules.
- [ ] `/sitemap.xml` resolves and lists `/` and `/explore`.
- [ ] `/opengraph-image` (or `<meta property="og:image">` on a page) renders the branded image.
- [ ] A 404 path (e.g. `/this-does-not-exist`) renders the branded 404.
- [ ] Sign up with a new email. Land on `/dashboard`.
- [ ] Clerk → Webhooks → Messages shows the `user.created` event with HTTP 200.
- [ ] Neon `production` branch shows the new `users` row within ~5 seconds.
- [ ] Create a deck, add five cards, save. Refresh — still there.
- [ ] Publish the deck. It appears on `/explore`.
- [ ] In a second incognito window, sign in as a different user, fork the deck. The first user gets a `fork_received` notification.
- [ ] Start a study session, mark a card wrong, complete the session. The summary screen lists the missed card. XP updates on `/dashboard`.
- [ ] Start a study session, close the tab, reopen — same card is shown.
- [ ] Create a collection, add two decks, publish it. Fork it from a second account. The first user gets a `collection_fork_received` notification.
- [ ] Import a deck JSON file. Verify the new deck has the right language pair and all the cards.
- [ ] Export the deck. Verify the file matches the `flashforge.deck` v1.0 format.
- [ ] In an admin account, soft-delete a deck from `/admin/decks`. Verify it disappears from `/explore` but the data is preserved in the database.
- [ ] Restore the deck. Verify it reappears.
- [ ] Sign out. Protected routes redirect to `/login`.

## After the flip

- [ ] Watch Vercel function logs and Neon connection count for the first 24 hours.
- [ ] Watch Clerk Webhook → Messages for the first 100 events; any 4xx needs investigation.
- [ ] Respond to any issues filed in the first week. Adjust the issue templates if the prompts are unclear.
- [ ] Add the project to the personal site at `https://denyspupin.dev/projects/flashforge` (Phase 8 of `PUBLIC_RELEASE_PLAN.md`).

## If something goes wrong

- **Webhook 400s in Clerk** → see `docs/DEPLOYMENT.md` Section 10.
- **Build fails after the flip** → revert by promoting the previous Vercel deployment; investigate; fix forward.
- **Destructive migration** → use Neon Time Travel to restore the production branch into a new branch, swap roles, redeploy. Do not edit applied migrations.
- **Secret leak** → rotate immediately. Do not try to scrub history before the rotation is complete; once rotated, use `git-filter-repo` (or BFG) to rewrite history. Rescan with `gitleaks`. Coordinate with anyone who has cloned the repo.
