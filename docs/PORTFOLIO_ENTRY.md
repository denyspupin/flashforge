# FlashForge — Personal-website project entry

This is a brief for the owner to publish on `denyspupin.dev` (Phase 8 of the public release plan). The public GitHub repository and the live demo must be live before this page is published.

## Page location

- **URL:** `https://denyspupin.dev/projects/flashforge`
- **Suggested path:** `content/projects/flashforge.mdx` (or `.md` if no MDX components are needed)

## Title

**FlashForge — A vocabulary workshop that respects your time**

## One-sentence outcome summary

A quiet, focus-first flashcard learning platform built end-to-end on Next.js 16 — from a Svix-verified Clerk webhook down to a Zustand state machine that remembers your place in a session even after you close the tab.

## Long summary (2–3 sentences, for the project card)

FlashForge helps language learners build, share, and study flashcard decks across nine languages, with a daily-streak XP loop that rewards showing up over grinding. I designed the entire stack myself — schema, API, real-time study player, public library, fork-and-import flow — and shipped it to production on Vercel + Neon + Clerk.

## Links

| Where | URL |
| --- | --- |
| Live demo | `https://flashforge.denyspupin.dev` |
| Source | `https://github.com/denyspupin/flashforge` |

## Stack

Next.js 16 · React 19 · TypeScript · PostgreSQL 16 · Drizzle ORM · Clerk · Tailwind CSS 4 · shadcn/ui · TanStack Query · Zustand · Zod · Vercel · Neon

## Screenshots (use 3–4 from `docs/screenshots/`)

Optimise before upload. Suggested crop to 16:10 or 16:9, max width 1600px, WebP if the site supports it.

| Order | File | Suggested caption |
| --- | --- | --- |
| 1 | `docs/screenshots/01-landing-hero.png` | "A landing page that earns the click — the workshop, the library, and the streak loop in one view." |
| 2 | `docs/screenshots/04-deck-detail.png` | "A public deck — language pair, topics, and a clear call to fork." |
| 3 | `docs/screenshots/06-study-back.png` | "Study mode. One card. No scroll. The session saves itself." |
| 4 | `docs/screenshots/03-explore.png` | "The community library — public decks across nine languages, filterable by source and target." |

Alt text for each screenshot (use the caption as a starting point; keep the alt text short and concrete, not poetic).

## Shipped features (do not include roadmap items here)

- Private and public flashcard decks organised by language pair and topic.
- Curated collections — group decks by theme and publish them as a single discoverable bundle.
- Public discovery and forking for both decks and collections, with `fork_received` and `collection_fork_received` notifications to the original author.
- Guest study (no account required) with a seamless sign-in upgrade that preserves progress.
- Resumable study sessions — Zustand state machine persists position to `localStorage`; the server treats an active session as a single, mutable document.
- XP and streak multipliers (×1 → ×3 over 30 days) with a "sentence, not a chain" streak philosophy.
- Eight seeded achievements (`First Steps`, `Perfect Score`, `Week Warrior`, `Polyglot`, `Deck Master`, `Card Collector`, `Topic Explorer`, `Fork Star`).
- Deck and collection import / export under documented JSON formats (`flashforge.deck` and `flashforge.collection` v1.0).
- Light, dark, and system theme, persisted per user.
- Admin tools for content moderation (soft delete + restore), prompt template management, and platform stats.

## Engineering focus

- **Authorisation as a first-class concern.** Every API route is gated by `requireCurrentUser` or `requireAdmin`/`requireCuratorOrAdmin`, ownership is checked on every mutation, and the Clerk webhook is the only public mutation entry point — signature-verified with Svix.
- **Isolated integration database.** The test suite runs against a separate `flashforge_test` database inside a `BEGIN` / `ROLLBACK` transaction per test, so nothing committed by a test ever touches the dev database.
- **Migrations and deployment design.** Drizzle is the single source of truth for SQL; migrations are committed to the repo and applied with `pnpm db:migrate`. The deployment runbook in `docs/DEPLOYMENT.md` separates pooled (read/write from Vercel) and direct (DDL from your laptop) Neon endpoints, sets up Cloudflare as DNS-only to avoid the orange-cloud redirect loop, and walks through rollback via Neon Time Travel.
- **Responsive product UX.** The whole app is keyboard-friendly, theme-aware, and tuned for touch. The branded 404 and 500 pages, `robots.txt`, `sitemap.xml`, and dynamic Open Graph image are all part of the public surface, not an afterthought.

## Verifying the page after publishing

- Page is reachable at `https://denyspupin.dev/projects/flashforge` with no 404.
- Screenshots load (correct dimensions, correct alt text, not pixelated).
- The "Live demo" and "Source" links resolve to the right URLs and are `rel="noopener"` if external.
- Lighthouse performance: aim for ≥ 90 on mobile for the portfolio page itself.
- Open Graph image renders when the project page is shared (test with <https://www.opengraph.xyz/>).
- Page is reachable from the projects index on the personal site.
