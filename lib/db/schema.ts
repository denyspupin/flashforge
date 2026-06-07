import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
  foreignKey,
} from "drizzle-orm/pg-core"

export const visibilityEnum = pgEnum("visibility", ["private", "public"])
export const sessionStatusEnum = pgEnum("session_status", [
  "active",
  "completed",
  "abandoned",
])
export const notificationTypeEnum = pgEnum("notification_type", [
  "fork_received",
  "achievement_unlocked",
])

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkId: varchar("clerk_id", { length: 256 }).notNull().unique(),
    name: varchar("name", { length: 256 }),
    avatarUrl: text("avatar_url"),
    nativeLanguageId: uuid("native_language_id").references(() => languages.id),
    xp: integer("xp").default(0).notNull(),
    streak: integer("streak").default(0).notNull(),
    streakUpdatedAt: timestamp("streak_updated_at", { withTimezone: true }),
    isCurator: boolean("is_curator").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("clerk_id_idx").on(table.clerkId)]
)

export const languages = pgTable("languages", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  code: varchar("code", { length: 16 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const topics = pgTable("topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 256 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const decks = pgTable(
  "decks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 256 }).notNull(),
    slug: varchar("slug", { length: 256 }).notNull(),
    description: text("description"),
    visibility: visibilityEnum("visibility").default("private").notNull(),
    sourceLanguageId: uuid("source_language_id")
      .references(() => languages.id)
      .notNull(),
    targetLanguageId: uuid("target_language_id")
      .references(() => languages.id)
      .notNull(),
    creatorId: uuid("creator_id")
      .references(() => users.id)
      .notNull(),
    isCurated: boolean("is_curated").default(false).notNull(),
    forkedFromDeckId: uuid("forked_from_deck_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.forkedFromDeckId],
      foreignColumns: [table.id],
    }),
  ]
)

export const deckTopics = pgTable("deck_topics", {
  deckId: uuid("deck_id")
    .references(() => decks.id, { onDelete: "cascade" })
    .notNull(),
  topicId: uuid("topic_id")
    .references(() => topics.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const cards = pgTable("cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  deckId: uuid("deck_id")
    .references(() => decks.id, { onDelete: "cascade" })
    .notNull(),
  front: text("front").notNull(),
  back: text("back").notNull(),
  timesReviewed: integer("times_reviewed").default(0).notNull(),
  timesCorrect: integer("times_correct").default(0).notNull(),
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const studySessions = pgTable("study_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  deckId: uuid("deck_id")
    .references(() => decks.id, { onDelete: "cascade" })
    .notNull(),
  status: sessionStatusEnum("status").default("active").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  cardsReviewed: integer("cards_reviewed").default(0).notNull(),
  cardsCorrect: integer("cards_correct").default(0).notNull(),
  failedCardIds: jsonb("failed_card_ids").default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const achievements = pgTable("achievements", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description").notNull(),
  xpValue: integer("xp_value").default(0).notNull(),
  conditionType: varchar("condition_type", { length: 256 }).notNull(),
  conditionValue: jsonb("condition_value").default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const userAchievements = pgTable("user_achievements", {
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  achievementId: uuid("achievement_id")
    .references(() => achievements.id, { onDelete: "cascade" })
    .notNull(),
  awardedAt: timestamp("awarded_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  type: notificationTypeEnum("type").notNull(),
  data: jsonb("data").default({}).notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})
