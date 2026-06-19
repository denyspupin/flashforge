# FlashForge — Deployment Runbook

How to ship FlashForge to **https://flashforge.denyspupin.dev**, and how to operate it after.

The codebase is already production-shaped (see `lib/db/client.ts`, `app/api/webhooks/clerk/route.ts`). This document is the procedure around it.

---

## Table of contents

1. [Architecture at a glance](#1-architecture-at-a-glance)
2. [Prerequisites](#2-prerequisites)
3. [One-time external service setup](#3-one-time-external-service-setup)
   - [3.1 Neon (Postgres)](#31-neon-postgres)
   - [3.2 Clerk (auth)](#32-clerk-auth)
   - [3.3 Vercel (hosting)](#33-vercel-hosting)
   - [3.4 Cloudflare (DNS)](#34-cloudflare-dns)
4. [Environment variables reference](#4-environment-variables-reference)
5. [First deploy](#5-first-deploy)
6. [Migrations workflow](#6-migrations-workflow)
7. [Subsequent deploys](#7-subsequent-deploys)
8. [Verification checklist](#8-verification-checklist)
9. [Rollback](#9-rollback)
10. [Troubleshooting](#10-troubleshooting)
11. [Local development with the production DB](#11-local-development-with-the-production-db)
12. [Post-launch hygiene](#12-post-launch-hygiene)
13. [Future work](#13-future-work)

---

## 1. Architecture at a glance

```
                          ┌─────────────────────┐
                          │   Cloudflare DNS    │
                          │ (denyspupin.dev)    │
                          └──────────┬──────────┘
                                     │ CNAME (DNS-only / grey cloud)
                                     ▼
                          ┌─────────────────────┐
                          │       Vercel       │
                          │  (Next.js 16 SSR)  │◀──── GitHub: denyspupin/flashforge
                          └──────────┬──────────┘
                                     │ pg over TLS (pooled endpoint)
                                     ▼
                          ┌─────────────────────┐
                          │        Neon         │◀──── Drizzle migrations (direct endpoint)
                          │  (Postgres branch:  │
                          │     production)     │
                          └─────────────────────┘
                                     ▲
                          ┌──────────┴──────────┐
                          │       Clerk        │──▶ Webhook ──▶ Vercel
                          │ (auth + Svix sig)  │    /api/webhooks/clerk
                          └─────────────────────┘
```

| Component | Purpose | Where it lives |
|---|---|---|
| **Next.js app** | The product | Vercel (serverless functions + edge) |
| **Postgres** | Source of truth | Neon, branch `production` |
| **Auth** | Sign-in / sign-up / OAuth | Clerk (managed) |
| **DNS** | `flashforge.denyspupin.dev` → Vercel | Cloudflare (grey-clouded CNAME) |
| **Source control** | Triggers Vercel builds | GitHub `denyspupin/flashforge` |

### Why this shape

- **Vercel + Neon pooler**: each Vercel function instance opens **1 Postgres connection** (`pg.Pool { max: 1 }`). The Neon pooler multiplexes those onto the actual compute. No connection storms, no pool exhaustion.
- **Svix-verified Clerk webhook**: every `user.created` / `user.updated` / `user.deleted` is cryptographically signed. Forged events are rejected at the edge with 400.
- **Cloudflare as DNS-only**: Vercel provisions its own Let's Encrypt cert. Putting CF's orange cloud in front breaks cert provisioning and causes redirect loops. Use CF for DNS, let Vercel handle TLS termination.

---

## 2. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20+ | Matches Vercel's runtime |
| pnpm | 11+ | Repo is `pnpm@11.3.0` |
| Docker | any | For local Postgres (`docker compose up -d`) |
| psql client | any | For running migrations against Neon |
| `gh` CLI | latest | For GitHub operations |
| `vercel` CLI | latest | Optional — UI is enough for solo dev |

### Accounts you need

- [ ] **Vercel** account (Hobby or Pro)
- [ ] **Neon** account (free tier is enough to start)
- [ ] **Clerk** account (production application)
- [ ] **Cloudflare** account (DNS for `denyspupin.dev`)
- [ ] **GitHub** access to `denyspupin/flashforge`

### Domain

`denyspupin.dev` is already on Cloudflare. Namecheap is the registrar; the nameservers point to Cloudflare's. We only need to add a CNAME record, no registrar action required.

---

## 3. One-time external service setup

Do these in order. After the first time, most of this is "check the dashboard" rather than "create things."

### 3.1 Neon (Postgres)

**Region:** `AWS US East (us-east-1)`. This is Vercel's default region and gives the lowest cold-start latency.

1. Sign in at https://console.neon.tech.
2. **New Project** → name: `flashforge-prod` → region: `AWS US East` → Postgres 16 → free tier (or Launch/Scale if you want 24/7 compute).
3. After creation, you'll land on the project dashboard. Open **Connection Details** and copy **two strings**:

   | Label | Hostname pattern | Use for |
   |---|---|---|
   | **Pooled** | `...-pooler.neon.tech` | Vercel `DATABASE_URL` (read/write from serverless) |
   | **Direct** | `...neon.tech` (no `-pooler`) | Migrations from your laptop; any DDL |

   Both include `postgresql://user:pass@host/db?sslmode=require`.

4. The default `main` branch is your dev/scratch branch. Create the real branches:

   ```bash
   # In the Neon SQL editor (or via psql), or just use the UI:
   # Branch → "main" → child branch "production"  (set as primary)
   # Branch → "main" → child branch "preview"     (for Vercel preview deploys sharing a DB)
   ```

   Set `production` as the **default branch** so new branches start from a clean copy of prod schema. (Optional — only matters if you start using Neon branching later.)

5. **Apply the schema to the `production` branch.** From your laptop:

   ```bash
   # Pull the direct (NOT pooled) connection string from Neon → "production" branch
   export DATABASE_URL='postgresql://...neon.tech/...?sslmode=require'
   pnpm db:push   # first time only — for clean apply
   # or
   pnpm db:migrate   # if you've already generated migrations in drizzle/
   ```

6. Verify the tables exist:

   ```bash
   psql "$DATABASE_URL" -c '\dt'
   ```

   You should see `users`, `decks`, `cards`, `study_sessions`, etc.

7. (Optional) **Seed mock data** for smoke testing:

   ```bash
   pnpm db:seed:mock
   ```

   Skip this if you want a clean DB.

#### Neon dashboard notes

- **Compute**: free tier auto-suspends after 5 min of inactivity. First query after sleep has a ~500ms cold start. Acceptable for MVP. If you need always-on, upgrade to Launch.
- **Backups**: free tier = 7 days point-in-time recovery. Restore via dashboard → "Time travel".
- **Branches**: each branch is a separate Postgres database. The "main" branch and "production" branch are independent; cloning "production" creates a child branch with current schema and data.

### 3.2 Clerk (auth)

#### Production application

1. Sign in at https://dashboard.clerk.com.
2. If you only have a dev instance so far, create a **Production** instance from the instance switcher (top-left) → "Create production instance" → name it `flashforge-prod`.
3. Inside the production instance:

   - **API Keys** → copy:
     - `pk_live_...` → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
     - `sk_live_...` → `CLERK_SECRET_KEY`
   - **Domains** → add `flashforge.denyspupin.dev`. Clerk needs this for OAuth callbacks and email-link redirects.

4. **Authentication** → enable the social providers you want (Google, GitHub, etc.). At minimum, enable **Email + Password** and **Email verification link**.

5. **Webhooks** → **Add Endpoint**:
   - Endpoint URL: `https://flashforge.denyspupin.dev/api/webhooks/clerk`
   - Events: subscribe to **`user.created`**, **`user.updated`**, **`user.deleted`**
   - Click **Create**, then **Show signing secret** → copy `whsec_...` → this is your `CLERK_WEBHOOK_SECRET`.

6. **Paths** (under **Account Portal** or **Custom Domains**):
   - Sign-in URL: `/login`
   - Sign-up URL: `/register`
   - After sign-in: `/dashboard`
   - After sign-up: `/dashboard`

7. (Optional) **Emails** → customize the sign-in / sign-up templates with FlashForge branding.

#### Test the webhook end-to-end (do this after first deploy)

1. Deploy (Section 5).
2. Sign up a real user on the live site.
3. Go to Clerk dashboard → **Webhooks** → your endpoint → **Messages** tab. You should see a `user.created` event with HTTP `200`.
4. In Neon SQL editor: `SELECT * FROM users;` — the new row should be there within ~1 second.

If you see HTTP `400` in Clerk's webhook log, the Svix verification is misconfigured (Section 10).

### 3.3 Vercel (hosting)

1. Sign in at https://vercel.com with GitHub.
2. **Add New → Project** → import `denyspupin/flashforge`.
3. Framework preset: **Next.js** (auto-detected).
4. **Root Directory**: leave default (project root).
5. **Build & Output Settings**: leave default. Vercel reads `pnpm build` from `package.json` scripts.
6. **Environment Variables**: add all variables from [Section 4](#4-environment-variables-reference) **before** the first deploy. You can set per-environment (Production / Preview / Development):
   - **Production**: use `pk_live_…`, `sk_live_…`, Neon `production` branch pooled URL
   - **Preview**: use the same prod keys, OR a separate Clerk dev instance + Neon `preview` branch pooled URL (your choice — sharing prod keys is fine for solo dev)
   - **Development**: doesn't apply unless you use `vercel dev` locally
7. **Deploy** — Vercel builds from whatever branch you select. For first deploy, use `main` (or your current production branch).

After the build succeeds, Vercel gives you a `*.vercel.app` URL. Now wire up the real domain.

8. **Settings → Domains** → **Add** → `flashforge.denyspupin.dev`.
9. Vercel will tell you the target, e.g. `cname.vercel-dns.com`. **Copy this** — you need it for Cloudflare in the next section.

### 3.4 Cloudflare (DNS)

1. Sign in at https://dash.cloudflare.com.
2. Select `denyspupin.dev` → **DNS** → **Records** → **Add record**:

   | Field | Value |
   |---|---|
   | Type | `CNAME` |
   | Name | `flashforge` |
   | Target | `cname.vercel-dns.com` (from Vercel) |
   | Proxy status | **DNS only** (grey cloud — click the orange cloud to turn it off) |
   | TTL | Auto |

3. Save. Propagation is usually <30s for CNAMEs on existing zones.

**Why grey cloud?** Vercel needs to issue a Let's Encrypt cert for `flashforge.denyspupin.dev`. If Cloudflare proxies (orange cloud) the request, Vercel never sees the cert challenge. The result: SSL handshake fails, browser shows `ERR_TOO_MANY_REDIRECTS` or `NET::ERR_CERT_AUTHORITY_INVALID`.

If you later want Cloudflare's WAF/DDoS in front, switch to **Full (Strict)** SSL mode in Cloudflare, then re-enable the proxy. Document this in Section 12 as future work.

4. Back in Vercel → **Domains** → the domain should turn from "Invalid Configuration" to a green check within ~1 minute (Vercel polls DNS and provisions the cert once it sees the CNAME pointing the right way).

---

## 4. Environment variables reference

Set these in **Vercel → Settings → Environment Variables**. For local dev, set in `.env.local` (gitignored).

### Public (sent to the browser)

| Name | Example | Purpose | Set in |
|---|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` | Clerk client-side SDK | Vercel: Prod + Preview · Local: `.env.local` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` | Where Clerk-hosted sign-in lives | Vercel + Local |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/register` | Where Clerk-hosted sign-up lives | Vercel + Local |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/dashboard` | Post-sign-in redirect | Vercel + Local |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/dashboard` | Post-sign-up redirect | Vercel + Local |
| `NEXT_PUBLIC_APP_URL` | `https://flashforge.denyspupin.dev` | Canonical app URL (for emails, OAuth) | Vercel: Prod (prod URL) + Preview (set to `https://$VERCEL_URL` for dynamic) · Local: `http://localhost:3000` |

### Server-only (never sent to the browser)

| Name | Example | Purpose | Set in |
|---|---|---|---|
| `DATABASE_URL` | `postgresql://…-pooler.neon.tech/…?sslmode=require` | Pooled Postgres connection (Vercel) | Vercel: Prod (Neon prod pooled) + Preview (Neon preview pooled or shared) · Local: docker URL |
| `CLERK_SECRET_KEY` | `sk_live_…` | Clerk server SDK | Vercel: Prod + Preview · Local |
| `CLERK_WEBHOOK_SECRET` | `whsec_…` | Verifies Svix signatures on `/api/webhooks/clerk` | Vercel: Prod (Clerk prod endpoint secret) + Preview (Clerk dev endpoint secret) · Local (optional) |

### Quick copy/paste block

```env
# .env.local (local dev — uses docker Postgres, Clerk dev instance)
DATABASE_URL=postgresql://flashforge:flashforge@localhost:5432/flashforge
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_…
CLERK_SECRET_KEY=sk_test_…
CLERK_WEBHOOK_SECRET=whsec_…        # from Clerk dev instance webhook
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

> **Never commit `.env.local`.** It is in `.gitignore`. If a secret leaks, rotate it immediately (Clerk has "Rotate" on the API key page; Neon lets you reset the password and rotate the connection string).

---

## 5. First deploy

1. Make sure `main` is in a deployable state. The latest commit is `94d9e24 Replace README with user-facing version` (or newer) — clean working tree.
2. From the `main` branch:

   ```bash
   git checkout main
   git pull
   pnpm install
   pnpm build       # local sanity check before pushing
   pnpm test        # all 69 tests pass
   git push
   ```

3. Vercel auto-detects the push and starts a build. Watch the **Deployments** tab.
4. After build succeeds, click **Visit** on the deployment. The `*.vercel.app` URL should render the landing page.
5. Now verify the custom domain (Section 8).

> **First deploy is slow.** Vercel cold-starts the function registry, Neon compute is cold (free tier), and Clerk's first sign-in might take a beat. Expect 30-60s for the first real interaction. Subsequent deploys and requests are much faster.

---

## 6. Migrations workflow

Schema changes flow through Drizzle migrations. The pattern is:

1. **Edit** `lib/db/schema.ts`.
2. **Generate** the migration locally:

   ```bash
   pnpm db:generate
   ```

   This writes a new `.sql` file in `drizzle/`. Inspect it (`git diff drizzle/`) — Drizzle is generally right, but always check destructive operations.

3. **Commit** the generated SQL to the repo:

   ```bash
   git add drizzle/
   git commit -m "feat(schema): add daily_streak_snapshots table"
   ```

4. **Apply to Neon** from your laptop, pointed at the **direct** (not pooled) connection:

   ```bash
   export DATABASE_URL='postgresql://…neon.tech/…?sslmode=require'   # direct
   pnpm db:migrate
   ```

   > **Use the direct endpoint for migrations.** Some DDL (`CREATE INDEX CONCURRENTLY`, advisory locks) doesn't play well with connection poolers. Migrations are rare and synchronous — the direct endpoint is fine.

5. **Push the code change** to `main`. Vercel deploys.

#### Initial schema sync (one-time)

If you're deploying for the first time and the Neon `production` branch is empty:

```bash
export DATABASE_URL='postgresql://…neon.tech/…?sslmode=require'   # direct
pnpm db:push    # or `pnpm db:migrate` if you want to use the versioned migration history
```

`db:push` is for greenfield (no migration history yet). `db:migrate` requires committed `.sql` files in `drizzle/`. After the initial sync, always use `db:generate` + `db:migrate`.

#### Pre-deploy migrations

If a migration is breaking (dropping a column the app still uses, adding a NOT NULL column without a default), coordinate carefully:

1. **First deploy**: add the column as nullable, deploy the app code that writes to it.
2. **Backfill**: run a SQL `UPDATE` to populate existing rows.
3. **Second deploy**: add the NOT NULL constraint, deploy the app code that no longer handles nulls.

For MVP you almost certainly don't need to do this. But if you ever do, document it in the migration's `.sql` file as a header comment so the next person understands.

#### Migrations against the preview branch

If you've set up a separate Neon `preview` branch (Section 3.1), apply migrations to it the same way but with that branch's direct connection string. Vercel previews sharing this branch will then have the latest schema.

---

## 7. Subsequent deploys

For solo dev, the flow is straightforward:

1. Branch off `main` for the feature/fix.
2. Open a PR. Vercel auto-creates a **preview deployment** with its own URL (e.g. `flashforge-git-feature-xyz-denyspupin.vercel.app`).
3. Reviewers (or you) can test on the preview URL.
4. Merge to `main` → Vercel auto-deploys to **production** (`flashforge.denyspupin.dev`).

> **Preview deploys share the same `DATABASE_URL` as production** by default. Be careful with migrations and data writes on preview branches — they hit the live database. If this becomes a problem, switch previews to the `preview` Neon branch (see Section 13).

### Hotfix flow

For a critical fix on production:

```bash
git checkout main
git pull
git checkout -b hotfix/foo
# make the fix
pnpm test
git commit -m "fix(hotfix): …"
git push -u origin HEAD
# open PR, get a quick review, merge
```

If you need to bypass the PR (e.g. site is down and you're the only one around), merge directly to `main` and push. Vercel will deploy. But **never** push to `main` without running tests first.

---

## 8. Verification checklist

Run this after every deploy. Most are visual smoke tests; a few are programmatic.

### Automated (Vercel side)

- [ ] **Build succeeded** in Vercel dashboard → Deployments → latest build → green check.
- [ ] **Function logs are clean** — no `Error: too many connections`, no `ECONNREFUSED`, no 5xx spikes.

### Automated (Neon side)

- [ ] **Connection count is low** — Neon dashboard → `production` branch → "Connections" graph. Should be flat at 0-2 with occasional spikes during traffic. Sustained high count → investigate.
- [ ] **Compute is healthy** — Neon dashboard → `production` branch → compute state should be "Active" or "Idle" (not "Suspended" mid-request).

### Manual smoke tests on `https://flashforge.denyspupin.dev`

- [ ] **SSL padlock** — click the lock icon, confirm cert is valid (Let's Encrypt, issued for `flashforge.denyspupin.dev`).
- [ ] **Landing page loads** — hero image visible, no console errors.
- [ ] **Public routes** — `/explore` returns a page (may be empty if no public decks).
- [ ] **Sign-up** — click "Sign up", complete the Clerk flow, land on `/dashboard`. Check Neon `users` table for the new row within 5s (this is the webhook end-to-end test).
- [ ] **Sign in** — sign out, sign back in with the same account. `requireCurrentUser` resolves without error.
- [ ] **Create a deck** — add a deck, add 5 cards, save. Refresh — still there.
- [ ] **Publish a deck** — flip visibility to public. It appears on `/explore`.
- [ ] **Fork a deck** — sign in as a different user (or incognito), fork the published deck. Original creator gets a `fork_received` notification.
- [ ] **Study session** — start a study session on a deck, flip a card, mark correct, complete. XP updates on `/dashboard`.
- [ ] **Resume a session** — start a study, close the tab, reopen — same card is shown.
- [ ] **Sign out** — protected routes redirect to `/login`.

### Webhook verification (Clerk dashboard)

- [ ] **Clerk → Webhooks → Messages** — recent events show HTTP 200 responses. Any 400/401 = Svix verification is broken (see Section 10).

If any item fails, the deploy is not healthy. Revert (Section 9) and investigate.

---

## 9. Rollback

### Code rollback

Vercel keeps the last few deployments. To revert to a previous deployment:

1. Vercel → **Deployments** → find a green (passing) build from before the broken one.
2. Click the **⋯** menu → **Promote to Production**.

The previous build is now serving traffic. Vercel does this with zero downtime.

> This only rolls back **code**, not database schema. If a migration broke the DB, you need a forward-fix migration to undo it.

### Database rollback

If a migration was destructive and you need to recover data:

1. Neon dashboard → `production` branch → **Time Travel** → choose a point in time before the bad migration → **Restore to new branch**.
2. Verify the restored branch has the data.
3. If it does, swap: rename the old broken branch to `production-broken`, promote the restored branch to `production` (Neon → Branch → **Set as primary**).
4. Update `DATABASE_URL` in Vercel to the new primary's pooled connection string.
5. Redeploy (Vercel → Deployments → latest → **Redeploy**).

> Neon free tier has 7 days of PITR. Launch has 30 days. Don't go past that window.

### Rollback the rollback

Once you've fixed the underlying issue, you can promote the original `production` branch back, fix forward, etc. ADRs and `.sql` files in `drizzle/` should be the source of truth — never edit a migration that was already applied to a real database.

---

## 10. Troubleshooting

### "Invalid webhook signature" in Clerk dashboard

**Symptom:** Clerk Webhooks → Messages shows HTTP 400 for `user.created` / `user.updated` / `user.deleted`.

**Cause:** `CLERK_WEBHOOK_SECRET` in Vercel doesn't match the signing secret of the configured endpoint.

**Fix:**

1. Clerk dashboard → Webhooks → your endpoint → **Show signing secret** → copy.
2. Vercel → Settings → Environment Variables → find `CLERK_WEBHOOK_SECRET` → paste the new value for the right environment (Production vs Preview).
3. **Redeploy** (Vercel → Deployments → latest → ⋯ → Redeploy). The env var is read at function cold start; a redeploy guarantees a fresh start.
4. Trigger a new event (sign up a test user) and confirm HTTP 200 in Clerk.

### "Missing Svix signature headers"

**Cause:** A non-Clerk request hit the webhook URL directly (someone running curl, a misconfigured proxy, a load test tool).

**Behavior:** Returns 400. Nothing else happens. Safe to ignore in production logs unless the rate is suspicious.

### Function logs: "too many connections" / "remaining connection slots are reserved"

**Cause:** Function instances are scaling up faster than `pg.Pool { max: 1 }` can keep up, **or** the Neon pooler is saturated.

**Fix:**

1. Check Neon dashboard → Connections. If it's pinned at 100, you need a higher-tier plan.
2. If it's well under the limit, the issue is that the function is **not closing connections**. Make sure your code paths don't hold transactions open longer than needed.
3. If intermittent — wait 30s. The free tier auto-scales, and the pooler has a small burst capacity.

### "column does not exist" at runtime

**Cause:** Schema in Neon doesn't match `lib/db/schema.ts`. Almost always means a migration was edited in `lib/db/schema.ts` but `pnpm db:migrate` was not run against the right database.

**Fix:**

```bash
export DATABASE_URL='postgresql://…neon.tech/…?sslmode=require'   # direct
pnpm db:migrate
```

Then redeploy. Section 6 has the full workflow.

### Build fails with "Module not found: Can't resolve 'svix'"

**Cause:** `pnpm install` was not run after the `svix` dep was added (see `package.json`).

**Fix:** `pnpm install` locally, commit `pnpm-lock.yaml`, push.

### DNS shows "Invalid Configuration" in Vercel

**Cause:** Cloudflare CNAME is not resolving, or proxy is enabled (orange cloud).

**Fix:**

1. Cloudflare DNS → confirm the `flashforge` CNAME has **DNS only** proxy.
2. From your terminal: `dig flashforge.denyspupin.dev CNAME` — should return the Vercel target. If it returns a CF IPs (like `104.16.x.x`), the proxy is still on.
3. Wait 1-2 minutes for Vercel to re-poll.

### Browser shows "ERR_TOO_MANY_REDIRECTS"

**Cause:** Almost always Cloudflare proxy is on. Turn it off (grey cloud), wait 30s.

### Local dev can't connect to Neon

**Cause:** Your IP is not on Neon's allowed list (free tier allows all IPs by default; if you enabled IP allow-list, add your IP or disable).

**Fix:** Neon dashboard → Project → Settings → **IP Allow List** → either add your IP or set to "Allow all".

---

## 11. Local development with the production DB

Sometimes you want to test against the real Neon database from your laptop (e.g., debugging a production-only data shape).

**Don't do this against the `production` branch.** Use a separate `preview` branch or your local docker Postgres.

If you really need to point local at Neon:

```bash
# 1. Create a one-off Neon branch from production (UI or CLI)
# 2. Copy the pooled connection string
# 3. Override DATABASE_URL just for that session
export DATABASE_URL='postgresql://…-pooler.neon.tech/…?sslmode=require'
pnpm dev
```

When you're done, **unset** `DATABASE_URL` and restart `pnpm dev` to go back to local docker.

> **Never run migrations against Neon from a feature branch without intending to ship the migration.** Drizzle doesn't know the difference between dev and prod.

### Testing the Clerk webhook locally

Clerk sends webhooks to public URLs. To test the webhook handler locally:

1. Install `ngrok` or `cloudflared`:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
2. Copy the public URL (e.g. `https://random-name.trycloudflare.com`).
3. Clerk dashboard → Webhooks → **Add Endpoint** with that URL + the same three events.
4. Sign up a test user through Clerk's UI on your local app. The webhook should fire and you can watch the function logs in your terminal.

---

## 12. Post-launch hygiene

These are "do them once and then forget" until you have a problem.

### Backups

- Neon free tier = 7 days PITR. Enough for MVP.
- When you upgrade to Launch/Scale (30 days PITR), set a quarterly reminder to **actually try a restore**. The time to find out PITR is broken is *not* when you need it.

### Clerk webhook signing secret rotation

Clerk lets you rotate the webhook signing secret. If you suspect compromise:

1. Clerk → Webhooks → endpoint → **Rotate secret**.
2. New secret shown. Copy.
3. Vercel → Env vars → update `CLERK_WEBHOOK_SECRET`.
4. Redeploy.
5. Clerk and Vercel are now in sync. Old secret is invalidated automatically after a brief grace period.

### Dependency updates

- Dependabot (free for public repos) or `pnpm update --interactive --latest` quarterly.
- Watch for `next` major versions — Next 17 will require code changes.
- Watch for `@clerk/nextjs` major versions — they occasionally require auth middleware changes.
- Watch for `drizzle-orm` major versions — schema syntax can shift.

### Security

- [ ] Vercel env vars: never logged, never echoed to the client.
- [ ] `.env.local` and `.env.test` are in `.gitignore` — keep it that way. If you accidentally commit a secret, rotate it immediately.
- [ ] Run `pnpm audit` before each release. Fix or document anything high-severity.
- [ ] The Clerk webhook is the only public mutation entry point. It is signature-verified. Don't ever bypass that.
- [ ] When you add new public APIs, validate input with Zod and check ownership before mutating.

### Cloudflare proxy (when you want it)

To put Cloudflare in front of Vercel (WAF, DDoS, bot protection):

1. Cloudflare → SSL/TLS → set mode to **Full (Strict)**.
2. Cloudflare → DNS → flip the `flashforge` CNAME to **Proxied** (orange cloud).
3. Cloudflare → Rules → add a rule preserving the `Host` header (sometimes CF changes it; Vercel needs the original).
4. Test thoroughly. Most redirects loops are caused by CF stripping or rewriting headers Vercel expects.

For an MVP this is overkill. Skip until traffic warrants it.

---

## 13. Future work

Things deliberately out of scope for the first launch. Document decisions in `docs/adr/` if/when you tackle them.

- **Neon branching per Vercel preview** — install the Vercel + Neon integration, so each PR gets a fresh DB branch with seeded data. Costs more (one Neon compute per branch). Worth it when you have contributors.
- **Sentry** — error tracking, performance monitoring. Vercel logs are enough until you wake up at 3am to a vague bug report.
- **GitHub Actions migration runner** — replace the manual `pnpm db:migrate` from your laptop with a CI job that runs on merge to `main`. Add `vercel/actions/git-repo-link`, a `workflow_dispatch` workflow that runs `pnpm db:migrate` against the prod direct URL. The secret is stored in GitHub repo secrets.
- **CDN / cache headers for `/community/decks`** — see ADR 0001. Mostly static, deserves a `revalidate` window. ADR 0001 explicitly left this out.
- **404 / 500 pages** — `app/not-found.tsx` and `app/error.tsx` with the FlashForge design system. Nice-to-have for production polish.
- **robots.txt, sitemap.xml** — for SEO once the public surface stabilizes.
- **Analytics** — Plausible or PostHog. Privacy-respecting, no cookie banner needed.
- **Email deliverability hardening** — Clerk handles auth emails. If you add transactional email later (deck forks, study reminders), use Resend or Postmark and warm up the sending domain.

---

## See also

- [`docs/DEVELOPER.md`](./DEVELOPER.md) — local development setup
- [`docs/PROJECT.md`](./PROJECT.md) — architecture, schema, API reference
- [`docs/TEST_PLAN.md`](./TEST_PLAN.md) — testing strategy
- [`AGENTS.md`](../AGENTS.md) — agent-facing conventions
- [`docs/adr/`](../adr) — architecture decision records
