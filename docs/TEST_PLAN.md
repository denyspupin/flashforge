# Test Plan

This document is the source of truth for how FlashForge is tested. Keep it in sync with `AGENTS.md` and `docs/PROJECT.md` when scope shifts.

## Goals

- Cover the parts that, if broken, silently wreck core value: the study loop (XP, streak, card stats) and the content-sharing loop (publish, fork, import).
- Fast feedback loop: full suite runs in < 30s locally.
- No "tests for tests": every test guards a behaviour, not a line of code.
- No E2E, no component tests, no admin coverage in this phase — see [Out of scope](#out-of-scope-this-phase) for what we're deliberately skipping and why.

## Tooling

| Package | Role |
|---|---|
| `vitest` | Test runner |
| `@vitest/coverage-v8` | Coverage (optional, dev-only) |

That's it. No DOM env, no component testing libraries — the v1 suite has no component tests and the store is exercised in `node` env to also cover the SSR-safety branch.

Only one framework-level mock: `vi.mock('@clerk/nextjs/server')`, rewired by `mockClerk` in the harness.

## Decisions

- **Framework:** Vitest, single project, `environment: 'node'`.
- **Database:** Real Postgres in a separate test database (`flashforge_test`), per-test transaction (`BEGIN` / `ROLLBACK`).
- **UI test scope:** 0 component tests in this phase.
- **E2E:** Deferred to phase 2.

## Repository changes

1. `package.json` — add `devDependencies` (`vitest`, `@vitest/coverage-v8`) and three scripts:
   ```jsonc
   {
     "test": "vitest run",
     "test:watch": "vitest",
     "test:unit": "vitest run tests/unit",
     "test:integration": "vitest run tests/integration"
   }
   ```
2. `vitest.config.ts` — single project, `environment: 'node'`, alias `@/* → ./*`, exclude `.next`, `node_modules`, `drizzle`.
3. `tests/.env.test` — `TEST_DATABASE_URL=postgresql://flashforge:flashforge@localhost:5432/flashforge_test`. New database, no rows committed.
4. `AGENTS.md` — append a one-paragraph "Testing" note pointing to `pnpm test`, the two scopes, and the `TEST_DATABASE_URL` requirement.
5. `.gitignore` — add `coverage/` and `tests/.env.test`.

## Test directory layout

```
tests/
  setup/
    global.ts                # env loading, global hooks
    db.ts                    # withTx(), getTestDb()
    clerk.ts                 # mockClerk({ clerkId, role, banned, deletedAt })
    route-call.ts            # callRoute(handler, { method, body, params })
    fixtures.ts              # seedUser, seedLanguage, seedTopic, seedDeck, seedCard, seedSession
  unit/
    slug.test.ts
    study-store.test.ts
  integration/
    api/
      decks-crud.test.ts
      decks-cards.test.ts
      decks-publish-fork-import.test.ts
      community-decks.test.ts
      study-start-complete.test.ts
      study-resume-abandon.test.ts
```

## Detailed test list

### Unit (no DB, < 2s)

- **`slug.test.ts`**
  - `uniqueSlug('foo')` → `'foo-copy'`
  - collision → `'foo-copy-2'`, `'foo-copy-3'`
  - unrelated slugs don't conflict
  - empty input handled

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
  - SSR-safety (`typeof window === 'undefined'`) — runs in node env to exercise the no-`window` branch

### Integration (real DB, < 30s)

Harness contract:
- `withTx()` opens `BEGIN`, runs the test, `ROLLBACK`s.
- `mockClerk({ clerkId, role, banned, deletedAt })` rewires `@clerk/nextjs/server` so `requireCurrentUser` / `requireAdmin` / `requireCuratorOrAdmin` resolve to a real DB row.
- `callRoute(handler, { method, body, params })` builds a `Request`, invokes the route handler, parses `NextResponse.json`, returns `{ data, status }`.

- **`decks-crud.test.ts`**
  - create → 201 with derived slug
  - list returns only caller's decks
  - PATCH title → slug re-derived
  - DELETE cascades cards/sessions
  - cross-owner access → 404
  - Zod failure on missing `title` → 400

- **`decks-cards.test.ts`**
  - single POST returns card with `deckId`
  - bulk insert returns N cards
  - PATCH partial (`front` only) keeps `back`
  - DELETE only the owner's card
  - cross-owner card mutation → 404

- **`decks-publish-fork-import.test.ts`** — the sharing loop:
  - publish flips visibility
  - non-owner publish → 404
  - unpublish flips back
  - fork public deck copies cards, derives unique slug, sends `fork_received` notification to original author
  - fork own deck → 409
  - fork private deck → 404
  - import round-trip: GET export of deck A, POST import with `target.mode=existing` to a same-language-pair deck B → all cards appended
  - `target.mode=new` creates a new deck with new slug
  - mismatched language pair on `existing` → 400
  - > 1000 cards → 400

- **`community-decks.test.ts`**
  - returns only public
  - `q` is case-insensitive substring on title
  - `topicId` filter inner-joins correctly
  - `sort=newest/oldest` ordering
  - `cardCount` matches

- **`study-start-complete.test.ts`** — the critical file:
  - start for private deck you don't own → 404
  - start for public deck → creates active session, returns cards in `createdAt` order
  - start again while active exists → same `sessionId`
  - complete on a fresh user with all-correct: XP strictly greater than the no-bonus baseline; `cards.timesCorrect` and `cards.timesReviewed` incremented; `lastReviewedAt` set; `status='completed'`; `failedCardIds=[]`
  - complete with 0 cards → no `DECK_COMPLETE` bonus, `xpAwarded=0`
  - complete with all-fail → no `DECK_PERFECT` bonus, `failedCardIds` populated
  - **streak math** (parameterised, mocked clock): null `streakUpdatedAt` → 1; same UTC day → unchanged; consecutive day → +1; gap of 2+ → 1
  - **multiplier**: 0/1/2 → 1, 3–6 → 1.5, 7–13 → 2, 14–29 → 2.5, 30+ → 3
  - re-complete → 409
  - complete a foreign session → 404

  > Tests assert the *contract* (bonuses granted, multiplier applied, stats incremented), not the exact XP arithmetic. The exact formula is one focused case at most, so refactors don't break the suite for the wrong reason.

- **`study-resume-abandon.test.ts`**
  - GET session with deck + language names
  - abandon marks `status='abandoned'`
  - abandon non-active session → 404
  - start again after abandon creates a new active session

## Out of scope (this phase)

| Area | Why we skip it |
|---|---|
| **Component tests** | The store + API tests cover the state machine and the contract; UI is mostly composition. Cut to 0 in this phase. |
| **E2E (Playwright)** | API tests catch the high-value regressions. Defer until dialog flows (e.g. collection-add-decks) prove stable. |
| **Admin routes** (stats, prompts, users, decks, languages, topics, collections) | Low-traffic, admin-only. A bug here is degraded moderation, not user-facing breakage. |
| **Collections** | Recent feature, not load-bearing. Manual QA suffices. |
| **Study history, dashboard, profile** | Read-only aggregations. A bug here is cosmetic. |
| **Webhooks** | New-user path. Catches you at dev time, low frequency in prod. |
| **Middleware matcher** | Static config; one wrong line breaks auth immediately and is obvious without a test. |
| **Theme store** | Cosmetic. |
| **Utility unit tests** (`languages-flags`, `export-schema`, `api-response`, `parseRole`) | Not on the critical path; route tests exercise the shape. Cut. |

## CI plan

- Single GitHub Actions job: install → start Postgres service container → `pnpm db:migrate` against `flashforge_test` → `pnpm test`.
- Optionally split into two jobs (unit, integration) once the integration suite grows past the 30s budget. Not needed in v1.

## Effort estimate

- Test harness (`setup/`): ~2–3 hours
- Unit tests: ~1–2 hours
- Integration tests: ~5–7 hours (the bulk is in `decks-publish-fork-import` and `study-start-complete`)
- CI wiring: ~1 hour
- **Total: ~1.5 working days**
