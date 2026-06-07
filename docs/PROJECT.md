# FlashForge - Project Documentation

## Overview

FlashForge is a vocabulary learning platform that allows users to create, organize, and study flashcard collections. Users can create personal decks organized by language pairs and topics, share their collections publicly, fork others' decks, and track their learning progress through an achievement-based XP system with streak multipliers.

---

## Core Features

### 1. Collections & Content Structure

**Hierarchy:**
```
Language (source) → Language (target) → Topic → Deck → Cards
```

Example: English → German + Food → Restaurant Vocabulary → [apple/apfel, bread/brot...]

**Language pairs:**
- Each deck specifies a source and target language
- Deck enforces consistency - all cards share the same language pair
- Users set their native/preferred language in profile

**Topics** - predefined starter set (expandable):
- Food
- Animals
- Household
- Work Meeting
- Doctor Visit
- Travel
- Shopping
- ... (more can be added over time)

**Deck scope:**
- A single deck can belong to multiple topics
- Example: "Restaurant Essentials" spans Food + Shopping

**Cards (MVP):**
- Front (term in source language)
- Back (translation in target language)
- Metadata: times_reviewed, times_correct, last_reviewed_at

### 2. Visibility & Sharing

- **Private by default** - new decks are visible only to the creator
- **Public toggle** - user can make any deck publicly discoverable or private again
- **Forking** - any user can fork a public deck:
  - Creates a complete copy in their account
  - Original creator receives a notification
  - Forked deck shows no attribution tag

### 3. Curated Content

- **Curator status** - admin grants curator privileges to trusted users
- **Curated decks** - curators create featured collections that can be highlighted on the platform
- **No review process** - user-published decks go live immediately (no approval gate)

### 4. Study Mode

**Flow:**
1. User selects a deck to study
2. Session created immediately (allows resuming)
3. Cards presented one by one:
   - Front shown → user reveals back → marks Pass/Fail
4. After all cards reviewed, failed cards are shown again (one retry round)
5. Study session complete → summary displayed (cards reviewed, correct, failed)
6. XP awarded based on performance

**Completion definition:**
- Going through all cards once
- Failed cards get one retry attempt
- Session marked complete when all cards attempted at least once

**Session lifecycle:**
- Status: `active` | `completed` | `abandoned`
- If active session exists for user+deck, return existing session (resumable)
- Sessions older than 24 hours without activity are considered abandoned

### 5. Gamification

**Achievement-based XP system** - XP awarded for completing decks and topics. Specific values defined in `lib/constants.ts`.

**Streak multipliers:**
- Daily streak = studying any deck on consecutive days
- Streak multiplier increases with consecutive days
- Minimum threshold to maintain streak: 1 card minimum
- Timezone: UTC for server calculations; client displays in local time

**Ranks (future feature):**
- XP thresholds translate to visible ranks/levels
- Implementation deferred to post-MVP

---

## User Interactions

### Non-authenticated Users
- Browse public decks
- View deck details and cards
- Search and filter community decks

### Authenticated Users
- Create and manage own decks
- Fork public decks to own account
- Study decks with progress tracking
- Resume incomplete study sessions
- Receive notifications (fork events, achievements)
- View personal XP and streak stats

---

## Future Considerations

- Ranks/levels system
- Additional card fields (images, audio, example sentences)
- Import/export decks (CSV/JSON)
- Progress statistics and learning analytics
- Real-time features (leaderboards, collaborative study)
- Mobile apps (iOS)

---

## Technical Architecture

### Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL (Neon) + Drizzle ORM |
| Auth | Clerk (credentials + OAuth) |
| Styling | Tailwind CSS + shadcn/ui |
| State | TanStack Query (server) + Zustand (UI) |
| Hosting | Vercel |

### Database Schema

```
User
├── id                  -- UUID primary key
├── clerk_id            -- Clerk user ID (unique)
├── name                -- Display name
├── avatar_url          -- Profile picture
├── native_language_id  -- User's preferred/native language
├── xp                  -- Total XP (default 0)
├── streak              -- Current daily streak (default 0)
├── streak_updated_at   -- Last streak update
├── is_curator          -- Curated content access (default false)
├── created_at
└── updated_at

Language
├── id                  -- UUID primary key
├── name                -- "English", "Spanish", "German"
├── code                -- "en", "es", "de"
├── created_at
└── updated_at

Topic
├── id                  -- UUID primary key
├── name                -- "Food", "Animals"
├── slug                -- "food", "animals"
├── created_at
└── updated_at

Deck
├── id                  -- UUID primary key
├── title               -- "German Food Vocabulary"
├── slug                -- URL-friendly identifier
├── description         -- Deck description
├── visibility          -- "private" | "public"
├── source_language_id  -- e.g., English
├── target_language_id  -- e.g., German
├── creator_id          -- User FK
├── is_curated          -- Featured by curator/admin (default false)
├── forked_from_deck_id -- Nullable, for forked decks
├── created_at
└── updated_at

DeckTopic
├── deck_id
├── topic_id
├── created_at

Card
├── id                  -- UUID primary key
├── deck_id
├── front               -- Term in source language
├── back                -- Translation in target language
├── times_reviewed      -- Review count (default 0)
├── times_correct       -- Correct answer count (default 0)
├── last_reviewed_at    -- Nullable
├── created_at
└── updated_at

StudySession
├── id                  -- UUID primary key
├── user_id
├── deck_id
├── status              -- "active" | "completed" | "abandoned"
├── started_at          -- Session start timestamp
├── completed_at        -- Nullable until complete
├── cards_reviewed      -- Total cards seen (default 0)
├── cards_correct       -- Cards marked correct (default 0)
├── failed_card_ids     -- JSON array of failed card IDs
├── created_at
└── updated_at

Achievement
├── id                  -- UUID primary key
├── name                -- "First Steps", "Deck Master"
├── description         -- Human-readable description
├── xp_value            -- XP awarded
├── condition_type      -- "deck_complete", "topic_complete", etc.
├── condition_value     -- JSON condition params
├── created_at
└── updated_at

UserAchievement
├── user_id
├── achievement_id
├── awarded_at
├── created_at

Notification
├── id                  -- UUID primary key
├── user_id
├── type                -- "fork_received", "achievement_unlocked"
├── data                -- JSON payload
├── read                -- Boolean (default false)
├── created_at
└── updated_at
```

**Schema notes:**
- All tables have `created_at` and `updated_at` timestamps
- UUIDs used for Decks, Cards, StudySessions for future import/export
- Deck deletion cascades to Cards and StudySessions
- Forking uses `Deck.forked_from_deck_id`; no separate Fork table

### API Design

**Base URL:** `/api/v1`

**Response format:**
```json
{
  "data": {...},
  "error": null
}
```

**Pagination:** `?page=1&limit=20&sort=newest`

#### Public Endpoints (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/languages` | List all available languages |
| GET | `/topics` | List all topics |
| GET | `/community/decks` | Browse public decks (filter: source, target, topic, q, sort) |
| GET | `/community/decks/:id` | View public deck with cards |
| GET | `/community/topics/:id/decks` | Public decks by topic |

#### Authenticated Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/me` | Get current user profile |
| PATCH | `/users/me` | Update profile |
| GET | `/decks` | List user's decks (private + own public) |
| POST | `/decks` | Create deck |
| GET | `/decks/:id` | Get own deck with cards |
| PATCH | `/decks/:id` | Update deck |
| DELETE | `/decks/:id` | Delete deck (cascades cards + sessions) |
| POST | `/decks/:id/publish` | Make deck public |
| POST | `/decks/:id/unpublish` | Make deck private |
| POST | `/decks/:id/fork` | Fork deck to own account |
| POST | `/decks/:id/cards` | Add card |
| PATCH | `/decks/:id/cards/:cardId` | Update card |
| DELETE | `/decks/:id/cards/:cardId` | Delete card |
| POST | `/decks/:id/cards/bulk` | Bulk add cards `[{front, back}]` |
| POST | `/study/start` | Start session `{ deck_id }` |
| GET | `/study/:sessionId` | Resume session |
| POST | `/study/:sessionId/complete` | Submit results, calculate XP |
| GET | `/study/history` | List past sessions |
| GET | `/notifications` | List notifications |
| PATCH | `/notifications/:id/read` | Mark as read |
| PATCH | `/notifications/read-all` | Mark all as read |

**Study Session Behavior:**
- Session created on `/study/start`
- If active session exists for user+deck, return existing session (resumable)
- `/study/:sessionId/complete` processes results and awards XP
- Abandoned sessions: no-op, can be restarted fresh

**Search:**
- Community deck search uses `ILIKE` on `title` and `description` (MVP)

### Project Structure

```
flashforge/
├── app/
│   ├── (public)/                # Public routes
│   │   ├── page.tsx             # Landing page
│   │   ├── explore/
│   │   │   └── page.tsx        # Community decks
│   │   └── decks/
│   │       └── [id]/
│   │           └── page.tsx    # Public deck view
│   ├── (auth)/                  # Auth routes
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/             # Authenticated routes
│   │   ├── layout.tsx          # Dashboard layout
│   │   ├── page.tsx            # User dashboard
│   │   ├── decks/
│   │   ├── study/
│   │   ├── profile/
│   │   └── notifications/
│   ├── api/
│   │   └── v1/                  # REST API
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── deck/
│   ├── card/
│   ├── study/
│   ├── layout/
│   ├── profile/
│   └── notifications/
├── lib/
│   ├── db/                      # Drizzle schema + client
│   ├── api/                     # API helpers
│   ├── auth/                    # Clerk helpers
│   ├── constants.ts             # XP values, streak multipliers, topics
│   └── utils/
├── hooks/                       # Custom React hooks
├── stores/                      # Zustand stores
└── types/                       # Shared TypeScript types
```

### State Management

| Layer | Tool | Purpose |
|-------|------|---------|
| Server state | TanStack Query | API calls, caching, background refetch, optimistic updates |
| UI state | Zustand | Study mode state, modal visibility, sidebar, drafts |

### Auth & User Sync

- **Clerk** handles authentication (credentials + OAuth)
- **Webhook** (`user.created`) creates corresponding row in local `User` table
- **Lazy fallback:** if webhook misses, first API call creates User row on demand
- All API endpoints use Clerk's `auth()` helper to verify authentication

### Validation

- **Zod** schemas validate all API request bodies and query parameters
- Types inferred from Zod schemas shared between API and client

### Considerations for Future Development

**Mobile apps:**
- REST API designed to be mobile-friendly
- Can serve as backend for iOS/Android apps
- Consider OpenAPI documentation for mobile team

**Real-time features:**
- WebSocket infrastructure can be added later
- Current architecture doesn't preclude real-time (e.g., Pusher, Ably)
- Consider Supabase Realtime or similar if needed in future

---

## Out of Scope (MVP)

- E2E testing
- Ranks/levels system
- Deck versioning
- Advanced card fields (images, audio, examples)
- Import/export functionality
- Comprehensive analytics

---

## Out of Scope (Future)

- Paid features / subscription model
- Collaborative study sessions
- AI-powered card suggestions
- Mobile native apps
- Leaderboards
