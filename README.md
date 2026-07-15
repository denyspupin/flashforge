<div align="center">

<img src="public/logo.png" width="72" height="72" alt="FlashForge" />

# FlashForge

### *Forge your fluency, one flash at a time.*

A quiet workshop for learning vocabulary — build flashcard decks your way, study them with focus, and watch a streak of small sessions compound into something remarkable.

[**Open the workshop →**](https://flashforge.denyspupin.dev) · [Browse the library](#explore-the-library) · [How it works](#how-it-works)

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![CI](https://github.com/denyspupin/flashforge/actions/workflows/ci.yml/badge.svg)](https://github.com/denyspupin/flashforge/actions/workflows/ci.yml)

</div>

---

<p align="center">
  <img src="docs/screenshots/01-landing-hero.png" alt="FlashForge — forge your fluency, one flash at a time" width="100%" />
</p>

---

## What is FlashForge?

FlashForge is a vocabulary learning platform built around flashcard decks, study sessions, and a streak system that rewards **showing up** instead of grinding.

You build decks organized by language pairs (English → German, Spanish → Japanese, anything) and topics (Food, Travel, Doctor Visit, …). You study them one card at a time — no scrolling, no flashcard fatigue, no notifications begging you back. Sessions save themselves, so you can step away and pick up exactly where you left off.

Whether you write your own decks or fork one from the community, the loop is the same: **a small, focused ritual you can actually keep.**

> No streaks-as-shaming. No notifications begging. Just a small loop that rewards showing up.

**[Try it →](https://flashforge.denyspupin.dev)** — sign up, fork a deck, study a session.

---

## Highlights

- **Decks organized by language pairs and topics** — pair any two languages, attach any topics; cards inherit the pair.
- **Curated collections** — group decks into themed collections, publish them, fork the whole thing in one click.
- **Public discovery and forking** — flip a deck public and it appears in the community library. Anyone can fork a public deck (deck or collection) into their own account.
- **Guest study** — anyone can study any public deck without an account. Sign in only when you want progress tracked.
- **Resumable sessions** — start a deck, walk away, come back to the same card. Sessions survive refresh, tab close, and browser restart.
- **Streak multipliers** — daily streaks compound (×1 → ×3 over 30 days), with a "sentence, not a chain" philosophy: one card keeps the streak alive, but the multiplier resets if you skip a day.
- **Free forever** — no credit card, no ads, no premium tier. Hosting costs are absorbed by the project.
- **Open library** — every public deck is browseable, studyable as a guest, and forkable.
- **Notifications** — quiet in-app pings when someone forks your deck/collection or unlocks an achievement.
- **Theming** — light, dark, and system theme, persisted per user.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router, React 19) |
| Database | [PostgreSQL 16](https://www.postgresql.org) + [Drizzle ORM](https://orm.drizzle.team) |
| Auth | [Clerk](https://clerk.com) (credentials + OAuth, Svix-verified webhook user sync) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |
| Server state | [TanStack Query](https://tanstack.com/query) |
| UI state | [Zustand](https://zustand-demo.pmnd.rs) |
| Validation | [Zod](https://zod.dev) |
| Hosting | [Vercel](https://vercel.com) (serverless) + [Neon](https://neon.tech) (managed Postgres) |

See [`docs/PROJECT.md`](./docs/PROJECT.md) for the full architecture write-up, database schema, and API surface.

---

## How it works

Three quiet rituals, every day.

### 1 · Compose your deck
Pair any two languages. Add cards one at a time, paste a list, or fork a deck the community has already polished. Every deck is yours to shape.

### 2 · Study with focus
One card. No scroll. Flip, self-assess, and review the missed ones at the end. Sessions save themselves — step away and return to exactly where you left off.

### 3 · Stack the small wins
XP for cards reviewed, multipliers for streaks that hold. A daily practice that asks for ten minutes, but rewards a lifetime of vocabulary.

<p align="center">
  <img src="docs/screenshots/06-study-back.png" alt="Study mode — one card, no scroll" width="100%" />
</p>

---

## Explore the library

The community has built decks across **nine languages** and dozens of real-world topics. Browse, study any deck as a guest, or **fork** one into your own account to make it your own.

Every deck has a clear language pair, the topics it belongs to, who built it, and how many cards it has. Curated decks and collections are highlighted by trusted community members.

<p align="center">
  <img src="docs/screenshots/03-explore.png" alt="Explore community decks" width="100%" />
</p>

---

## Anatomy of a deck

Each deck has a title, description, a language pair, the topics it belongs to, and the cards inside. Public decks are open to the world; private decks live only in your account. You can flip visibility whenever you want.

<p align="center">
  <img src="docs/screenshots/04-deck-detail.png" alt="A public deck — Restaurant Essentials" width="100%" />
</p>

---

## Collections

A collection is a themed bundle of decks that share a language pair. Fork a whole collection and you get every deck inside, ready to study or customise.

---

## XP that compounds, streaks that reward patience

A day-one session earns what a day-one session should. A thirty-day streak earns three times that. The numbers reward the thing you actually want to build: **a habit that sticks.**

| Streak | Multiplier | Vibe |
| --- | --- | --- |
| 1 day | ×1 | Warm-up |
| 3 days | ×1.5 | Gaining |
| 7 days | ×2 | Locked in |
| 14 days | ×2.5 | On fire |
| 30 days | ×3 | Forged |

> **A streak is a sentence — not a chain.** One card keeps it alive. There is no penalty for missing a day; there is only a quiet loss of the multiplier. The fire returns the moment you do.

---

## Topics in the workshop

Every topic is a doorway — build it out in any direction the language takes you. A single deck can belong to multiple topics at once (*"Restaurant Essentials"* spans **Food** + **Shopping**; *"Fruits & Vegetables"* lives across both).

**Food** · **Animals** · **Household** · **Work Meeting** · **Doctor Visit** · **Travel** · **Shopping** · *…and more, all the time.*

---

## Local development

```bash
# 1. Use the pinned Node version
nvm use            # or: asdf install

# 2. Install dependencies
corepack enable
pnpm install --frozen-lockfile

# 3. Start dev + test databases
docker compose up -d
cp .env.example .env.local
cp tests/.env.test.example tests/.env.test

# 4. Apply schema and run
pnpm db:migrate
pnpm db:migrate:test
pnpm db:seed
pnpm dev
```

Then open <http://localhost:3000>. See [`docs/DEVELOPER.md`](./docs/DEVELOPER.md) for the full setup, including Clerk credentials, the test database, and the project layout.

### Run the tests

```bash
pnpm test              # unit + integration
pnpm test:unit         # unit only
pnpm test:integration  # integration only
pnpm test:watch        # watch mode
```

Tests run against an isolated Postgres (`flashforge_test`); they do not touch the dev database. See [`docs/TEST_PLAN.md`](./docs/TEST_PLAN.md) for what is and isn't covered.

---

## Repository layout

```
app/                   # Next.js App Router
  (public)/            # Landing, explore, public deck view
  (auth)/              # Login, register
  (dashboard)/         # Authenticated app
  admin/               # Admin tools (role-gated)
  api/v1/              # REST API
components/            # deck/, card/, study/, layout/, profile/, …
lib/                   # Drizzle schema, auth helpers, query layer, constants
hooks/                 # Custom React hooks
stores/                # Zustand stores
docs/                  # This README + architecture, deployment, and release notes
scripts/               # Seed scripts (db:seed, db:seed:mock, db:seed:prompts)
drizzle/               # Generated SQL migrations
tests/                 # Vitest suite (unit + integration against flashforge_test)
```

---

## Contributing

This is a **showcase project**. Issues are welcome; please open one before sending substantial PRs so we can agree on direction. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for conventions, the agent-facing [`AGENTS.md`](./AGENTS.md) for safety rules, and [`SECURITY.md`](./SECURITY.md) for how to report a vulnerability privately.

---

## Project status

The application is live at <https://flashforge.denyspupin.dev>. The repository is currently **private** while the public-release checklist in [`docs/PUBLIC_RELEASE_PLAN.md`](./docs/PUBLIC_RELEASE_PLAN.md) is being worked through.

---

## License

[MIT](./LICENSE) — see the file for full text. The mock seed data in `scripts/seed-mock.ts` is original; the screenshots under `docs/screenshots/` are local product renders.

<div align="center">

<sub>Built with care. Two card flips at a time.</sub>

</div>
