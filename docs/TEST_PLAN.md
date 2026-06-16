# Test Plan

This document is the source of truth for how FlashForge is tested. Keep it in sync with `AGENTS.md` and `docs/PROJECT.md` when scope shifts.

## Goals

- Cover the parts that, if broken, silently wreck core value: studying, XP, forks, publishing, admin moderation.
- Fast feedback loop: full unit + integration suite runs in < 30s locally.
- No "tests for tests": every test guards a behaviour, not a line of code.
- No E2E in this phase — the API + state-machine tests catch the high-value regressions; E2E is a follow-up.

## Tooling

| Package | Role |
|---|---|
| `vitest` | Test runner |
| `@vitest/coverage-v8` | Coverage (optional, dev-only) |
| `happy-dom` | DOM env for the 3 component tests |
| `@testing-library/react` + `@testing-library/user-event` | Component testing primitives |

No new framework-level mocks beyond `vi.mock('@clerk/nextjs/server')`.

## Decisions

- **Framework:** Vitest + happy-dom.
- **Database:** Real Postgres in a per-test transaction.
- **UI test scope:** Lean — 3 components.
- **E2E:** Deferred to phase 2.

## Repository changes

1. `package.json` — add `devDependencies` (`vitest`, `@vitest/coverage-v8`, `happy-dom`, `@testing-library/react`, `@testing-library/user-event`) and four scripts:
   ```jsonc
   {
     "test": "vitest run",
     "test:watch": "vitest",
     "test:unit": "vitest run tests/unit tests/component",
     "test:integration": "vitest run tests/integration"
   }
   ```
2. `vitest.config.ts` — single project, `environment: 'happy-dom'`, alias `@/* → ./*`, exclude `.next`, `node_modules`, `drizzle`.
3. `vitest.setup.ts` — `@testing-library/jest-dom` matchers, no-op `localStorage`/`window` shim if happy-dom needs it.
4. `tests/.env.test` — `TEST_DATABASE_URL=postgresql://flashforge:flashforge@localhost:5432/flashforge_test`. New database, no rows committed.
5. `AGENTS.md` — append a one-paragraph "Testing" note pointing to `pnpm test`, the two scopes, and the `TEST_DATABASE_URL` requirement.
6. `.gitignore` — add `coverage/` and `tests/.env.test`.

## Test directory layout

```
tests/
  setup/
    global.ts                # @testing-library cleanup, happy-dom polyfills
    db.ts                    # withTx(), getTestDb()
    clerk.ts                 # mockClerk({ clerkId, role, banned, deletedAt })
    route-call.ts            # callRoute(handler, { method, body, params })
    fixtures.ts              # seedUser, seedLanguage, seedTopic, seedDeck, seedCard, seedSession, seedPrompt
    localstorage.ts          # in-memory localStorage for store tests
  unit/
    slug.test.ts
    languages-flags.test.ts
    export-schema.test.ts
    auth-user.test.ts
    api-response.test.ts
    study-store.test.ts
  integration/
    api/
      decks-crud.test.ts
      decks-cards.test.ts
      decks-publish-fork.test.ts
      decks-import-export.test.ts
      study-start-complete.test.ts
      study-resume-abandon.test.ts
      notifications.test.ts
      community-decks.test.ts
      dashboard.test.ts
      profile.test.ts
      users-me.test.ts
      admin-stats.test.ts
      admin-prompts.test.ts
      admin-users.test.ts
      admin-decks.test.ts
      webhooks-clerk.test.ts
    middleware/
      proxy.test.ts
  component/
    deck-card.test.tsx
    study-controls.test.tsx
    study-frame.test.tsx
```

## Detailed test list

### Unit (no DB, < 2s)

- **`slug.test.ts`**
  - `uniqueSlug('foo')` → `'foo-copy'`
  - collision → `'foo-copy-2'`, `'foo-copy-3'`
  - unrelated slugs don't conflict
  - empty input handled

- **`languages-flags.test.ts`**
  - known codes (`en`→🇺🇸, `de`→🇩🇪, `pt`→🇧🇷)
  - unknown code → `""`
  - null/undefined → `""`
  - `enrichLanguage` adds flag immutably
  - `enrichLanguages` array variant

- **`export-schema.test.ts`**
  - accepts minimal valid payload
  - rejects wrong `format` / `formatVersion`
  - rejects empty `cards`
  - rejects oversized cards (>1000)
  - rejects bad `sourceLanguage` length
  - rejects bad `target` discriminator
  - rejects wrong `target.mode` shapes

- **`auth-user.test.ts`**
  - `isAdmin` / `isCuratorOrAdmin` for each role + null
  - `parseRole` rejects garbage strings and non-strings

- **`api-response.test.ts`**
  - `successResponse` shape
  - `errorResponse` shape
  - `errorResponse` preserves message and code

- **`study-store.test.ts`** — full state machine + persistence:
  - init cold
  - init warm-restore
  - init card-count-mismatch → fresh
  - flip toggles
  - pass1 mid-list advance
  - pass1 last-card no-fail → done + clear storage
  - pass1 last-card with-fail → retry queue
  - retry last → done
  - answer no-op
  - reset clears
  - selectors across phases
  - SSR-safety (`typeof window === 'undefined'`)

### Integration (real DB, < 30s)

Harness contract:
- `withTx()` opens `BEGIN`, runs the test, `ROLLBACK`s.
- `mockClerk({ clerkId, role, banned, deletedAt })` rewires `@clerk/nextjs/server` so `requireCurrentUser` / `requireAdmin` / `requireCuratorOrAdmin` resolve to a real DB row.
- `callRoute(handler, { method, body, params })` builds a `Request`, invokes the route handler, parses `NextResponse.json`, returns `{ data, status }`.

- **`decks-crud.test.ts`**
  - create → 201 with derived slug
  - create with topics → `deck_topics` rows exist
  - list returns only caller's decks
  - PATCH title → slug re-derived
  - PATCH topics → old `deck_topics` deleted, new ones inserted atomically
  - DELETE cascades cards/sessions
  - cross-owner access → 404
  - Zod failure on missing `title` → 400

- **`decks-cards.test.ts`**
  - single POST returns card with `deckId`
  - bulk insert returns N cards
  - PATCH partial (`front` only) keeps `back`
  - DELETE only the owner's card
  - cross-owner card mutation → 404

- **`decks-publish-fork.test.ts`**
  - publish flips visibility
  - non-owner publish → 404
  - unpublish flips back
  - fork public deck copies cards+topics, derives unique slug, sends `fork_received` notification to original
  - fork own deck → 409
  - fork private deck → 404

- **`decks-import-export.test.ts`**
  - round-trip: GET export of deck A, POST import with `target.mode=existing` to a same-language-pair deck B → all cards appended
  - `target.mode=new` creates a new deck with new slug
  - unknown language code → 400 + message lists `missingLanguages`
  - unknown topic slug → 400 + `missingTopics`
  - mismatched language pair on `existing` → 400
  - > 1000 cards → 400

- **`study-start-complete.test.ts`** — the critical file:
  - start for private deck you don't own → 404
  - start for public deck → creates active session, returns cards in `createdAt` order
  - start again while active exists → same `sessionId`
  - complete with all-correct on a fresh user: `xpAwarded = 5N + 10N + 50 + 100` (× multiplier 1), `totalXp` = previous + `xpAwarded`, `cards.timesCorrect` and `cards.timesReviewed` incremented, `lastReviewedAt` set, `status='completed'`, `failedCardIds=[]`
  - complete with 0 cards → no `DECK_COMPLETE` bonus, `xpAwarded=0`
  - complete with all-fail → no `DECK_PERFECT` bonus, `failedCardIds` populated
  - **streak math** (parameterised, mocked clock): null `streakUpdatedAt` → 1; same UTC day → unchanged; consecutive day → +1; gap of 2+ → 1
  - **multiplier**: 0/1/2 → 1, 3–6 → 1.5, 7–13 → 2, 14–29 → 2.5, 30+ → 3
  - re-complete → 409
  - complete a foreign session → 404

- **`study-resume-abandon.test.ts`**
  - GET session with deck + language names
  - abandon marks `status='abandoned'`
  - abandon non-active session → 404
  - start again after abandon creates a new active session

- **`notifications.test.ts`**
  - list scoped to current user
  - mark-one PATCH only the owner's notification (cross-user → 404)
  - mark-all only updates caller's rows

- **`community-decks.test.ts`**
  - returns only public
  - `q` is case-insensitive substring on title
  - `topicId` filter inner-joins correctly
  - `sort=newest/oldest` ordering
  - topics array hydrated per deck
  - `cardCount` matches

- **`dashboard.test.ts`**
  - returns user object, deck count, recent decks (≤ 6) ordered by `updatedAt`, languages by id
  - active session appears only if deck is owned by the caller

- **`profile.test.ts`**
  - returns user with email + image from Clerk
  - languages list
  - stats: `deckCount`, `cardCount` (sum of cards in user's decks), `completedSessionCount`, `achievementCount`

- **`users-me.test.ts`**
  - GET returns current user
  - PATCH validates avatar URL (http/https only, empty string → null falls back to Clerk image)
  - PATCH validates `nativeLanguageId` exists in `languages`
  - PATCH allows clearing `name` to null

- **`admin-stats.test.ts`**
  - totals (users, decks, public, private, curated, cards) correct
  - banned + soft-deleted counted correctly
  - activity windows (7d/30d) reflect seeded `startedAt`
  - top language pairs / top topics ordered by `deckCount` desc, limit 5

- **`admin-prompts.test.ts`** — one-active-per-slug invariant:
  - create v1, then v2, then v3 with monotonically increasing versions
  - activate v2 → v1 `isActive=false`, v2 `isActive=true`
  - activate deleted prompt → 409
  - unique `(slug, version)` collision (manual insert) → POST 409
  - non-admin caller → 403

- **`admin-users.test.ts`**
  - PATCH role works
  - PATCH `isBanned=true` → subsequent `requireCurrentUser` returns null (banned guard)
  - self-demote attempt (`admin` demoting self) → 400
  - self-delete attempt → 400
  - non-admin caller → 403

- **`admin-decks.test.ts`**
  - DELETE soft-deletes deck and cascades to cards (`deletedAt` set, deck flipped to `private`)
  - restore un-soft-deletes

- **`webhooks-clerk.test.ts`**
  - `user.created` inserts a row
  - `user.created` with duplicate `clerkId` is a no-op (idempotent)
  - `user.updated` patches fields
  - `user.deleted` removes the row
  - payload with no `data.id` → no DB change, 200

- **`middleware/proxy.test.ts`** — public matcher matrix:
  - public: `/`, `/explore`, `/explore/decks/123`, `/login`, `/api/v1/languages`, `/api/v1/community/decks`, `/api/webhooks/clerk`
  - protected: `/dashboard`, `/api/v1/decks`, `/api/v1/study/start`

### Components

- **`deck-card.test.tsx`**
  - renders correct visibility badge variant
  - shows "Curated" / "Forked" / topic badges per props
  - pluralises "card" / "cards"
  - "Study" button visible only when `onStudy` is provided

- **`study-controls.test.tsx`**
  - pre-flip: shows "Reveal answer" only
  - post-flip: shows "Missed it" + "Next card"
  - on last retry card, label is "Finish round"

- **`study-frame.test.tsx`**
  - `StudyCardArea` returns `null` when no current card
  - renders `CardFront` when not flipped
  - `CardBack` visible when flipped

## Out of scope (this phase)

- E2E via Playwright.
- Other admin views' component rendering — covered indirectly by API tests.
- Landing page components — pure marketing, no business logic.
- Visual / snapshot tests.
- Performance / load.

## CI plan

- Add a single GitHub Actions job: install → start Postgres service container → `pnpm db:migrate` against `flashforge_test` → `pnpm test`.
- Optionally split into two jobs (unit, integration) for ~10s vs ~30s feedback. CI provider TBD (Vercel? GH Actions? Other?).

## Effort estimate

- Test harness (`setup/`): ~3–4 hours
- Unit tests: ~2–3 hours
- Integration tests: ~6–8 hours
- Component tests: ~1 hour
- CI wiring: ~1 hour
- **Total: ~2 working days**
