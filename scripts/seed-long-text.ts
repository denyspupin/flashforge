import { eq, and, sql } from "drizzle-orm"
import { db } from "../lib/db/client.ts"
import {
  cards,
  collectionDecks,
  collections,
  deckTopics,
  decks,
  languages,
  topics,
  users,
} from "../lib/db/schema.ts"
import { DEFAULT_LANGUAGES } from "../lib/constants.ts"

const SEED_USER_CLERK_ID = "mock_seed_long-text"
const DECK_A_SLUG = "seed-long-text-compound-de"
const DECK_B_SLUG = "seed-long-text-mixed-de"
const COLLECTION_SLUG = "seed-coll-long-text-de"

const seedClerkId = process.env.SEED_CLERK_USER_ID?.trim() || SEED_USER_CLERK_ID

const COMPOUND_1 = "Rindfleischetikettierungsüberwachungsaufgabenübertragungsgesetz"
const COMPOUND_2 = "Donaudampfschifffahrtsgesellschaftskapitänsdienstanweisungsheft"
const COMPOUND_3 = "Grundstücksverkehrsgenehmigungszuständigkeitsübertragungsverordnung"

const COLLECTION_TITLE = `Long-text seed: ${COMPOUND_1} und ${COMPOUND_2} — extreme truncation stress test`

const COLLECTION_DESCRIPTION =
  `${COMPOUND_3} is the longest single unbreakable token in this test description, and it must never push a card wider than its grid column. ` +
  "This pack exists purely to seed pathological long text: the detail header must keep the title on one truncated line with an ellipsis, the description must wrap across multiple lines at full container width without expanding the page horizontally, and every card must clamp its own title and description with a proper ellipsis instead of clipping mid-word. " +
  `A further run of oversized tokens — ${COMPOUND_2}, ${COMPOUND_1}, ${COMPOUND_3} — makes sure both wrapping and clamping are exercised at 320px, 390px, 640px, and 1440px viewport widths across explore lists, collection grids, and deck detail pages.`

const DECK_A_TITLE = `Long-text seed deck A: ${COMPOUND_1} and ${COMPOUND_2} card-clamp stress test`

const DECK_A_DESCRIPTION =
  `Deck A packs the harshest cases together: it opens with ${COMPOUND_3} and follows immediately with ${COMPOUND_1}, forcing clamp boxes to wrap inside the narrowest words they can break. ` +
  "The grid must never overflow horizontally and the title line must always end in an ellipsis rather than running beneath the action buttons or being cut mid-letter."

const DECK_B_TITLE = `Long-text seed deck B — travel phrases with ${COMPOUND_2} and moderately long spaced words for clamp fallback checks`

const DECK_B_DESCRIPTION =
  "Deck B mixes ordinary spaced English words with a single oversized German compound so engines that lose line-clamp support still fall back to clean wrapping. " +
  `The longest token, ${COMPOUND_2}, is deliberately placed mid-sentence to catch overflow bugs that only appear once a line has already started.`

const DECK_A_CARDS: CardPair[] = [
  ["hello", "hallo"],
  ["bread", "Brot"],
  ["water", "Wasser"],
  ["menu", "Speisekarte"],
  ["bill", "Rechnung"],
  ["waiter", "Kellner"],
  ["chair", "Stuhl"],
  ["window", "Fenster"],
  ["door", "Tür"],
  ["thank you", "danke"],
]

const DECK_B_CARDS: CardPair[] = [
  ["good morning", "guten Morgen"],
  ["good evening", "guten Abend"],
  ["see you later", "bis später"],
  ["excuse me", "Entschuldigung"],
  ["where is", "wo ist"],
  ["how much", "wie viel"],
  ["train station", "Bahnhof"],
  ["airport", "Flughafen"],
  ["help", "Hilfe"],
  ["welcome", "willkommen"],
]

type CardPair = readonly [string, string]

function assertTitleLength(title: string, label: string) {
  if (title.length > 255) {
    throw new Error(
      `${label} is ${title.length} chars; titles are varchar(256)`
    )
  }
}

async function ensureLanguages() {
  await db
    .insert(languages)
    .values([...DEFAULT_LANGUAGES])
    .onConflictDoNothing({ target: languages.code })
}

async function ensureSeedUser(sourceLangId: string): Promise<string> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, seedClerkId))
    .limit(1)

  if (existing) return existing.id

  const values = {
    clerkId: seedClerkId,
    name: seedClerkId === SEED_USER_CLERK_ID ? "Long-text Seed" : "You",
    nativeLanguageId: seedClerkId === SEED_USER_CLERK_ID ? sourceLangId : null,
    role: "user" as const,
  }
  const [row] = await db.insert(users).values(values).returning({ id: users.id })
  return row.id
}

async function upsertDeck(input: {
  slug: string
  title: string
  description: string
  creatorId: string
  sourceLangId: string
  targetLangId: string
  topicSlug: string | null
  cardPairs: CardPair[]
}): Promise<string> {
  const [existing] = await db
    .select({ id: decks.id })
    .from(decks)
    .where(eq(decks.slug, input.slug))
    .limit(1)

  let deckId: string
  if (existing) {
    deckId = existing.id
    await db
      .update(decks)
      .set({
        title: input.title,
        description: input.description,
        updatedAt: new Date(),
      })
      .where(eq(decks.id, deckId))
  } else {
    const [row] = await db
      .insert(decks)
      .values({
        slug: input.slug,
        title: input.title,
        description: input.description,
        visibility: "public",
        creatorId: input.creatorId,
        sourceLanguageId: input.sourceLangId,
        targetLanguageId: input.targetLangId,
      })
      .returning({ id: decks.id })
    deckId = row.id
  }

  if (input.topicSlug) {
    const [topicRow] = await db
      .select({ id: topics.id })
      .from(topics)
      .where(eq(topics.slug, input.topicSlug))
      .limit(1)
    if (topicRow) {
      const [linked] = await db
        .select({ deckId: deckTopics.deckId })
        .from(deckTopics)
        .where(
          and(eq(deckTopics.deckId, deckId), eq(deckTopics.topicId, topicRow.id))
        )
        .limit(1)
      if (!linked) {
        await db
          .insert(deckTopics)
          .values({ deckId, topicId: topicRow.id })
          .onConflictDoNothing()
      }
    }
  }

  const [{ count: cardCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(cards)
    .where(eq(cards.deckId, deckId))

  if (cardCount === 0) {
    await db.insert(cards).values(
      input.cardPairs.map(([front, back]) => ({
        deckId,
        front,
        back,
      }))
    )
  }

  return deckId
}

async function upsertCollection(input: {
  slug: string
  title: string
  description: string
  creatorId: string
  sourceLangId: string
  targetLangId: string
  deckIds: string[]
}): Promise<string> {
  const [existing] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(eq(collections.slug, input.slug))
    .limit(1)

  let collectionId: string
  if (existing) {
    collectionId = existing.id
    await db
      .update(collections)
      .set({
        title: input.title,
        description: input.description,
        updatedAt: new Date(),
      })
      .where(eq(collections.id, collectionId))
  } else {
    const [row] = await db
      .insert(collections)
      .values({
        slug: input.slug,
        title: input.title,
        description: input.description,
        visibility: "public",
        creatorId: input.creatorId,
        sourceLanguageId: input.sourceLangId,
        targetLanguageId: input.targetLangId,
      })
      .returning({ id: collections.id })
    collectionId = row.id
  }

  if (input.deckIds.length > 0) {
    await db
      .insert(collectionDecks)
      .values(
        input.deckIds.map((deckId, idx) => ({
          collectionId,
          deckId,
          position: idx,
        }))
      )
      .onConflictDoNothing()
  }

  return collectionId
}

async function main() {
  console.log("FlashForge long-text seed")
  console.log(
    `  seed user clerk: ${seedClerkId === SEED_USER_CLERK_ID ? "(mock) " : ""}${seedClerkId}`
  )
  console.log()

  assertTitleLength(COLLECTION_TITLE, "Collection title")
  assertTitleLength(DECK_A_TITLE, "Deck A title")
  assertTitleLength(DECK_B_TITLE, "Deck B title")

  console.log("Ensuring languages...")
  await ensureLanguages()

  const langRows = await db.select().from(languages)
  const langByCode = new Map(langRows.map((l) => [l.code, l.id]))
  const enId = langByCode.get("en")
  const deId = langByCode.get("de")
  if (!enId || !deId) throw new Error("Missing en/de language rows")

  console.log("Ensuring seed user...")
  const creatorId = await ensureSeedUser(enId)

  console.log("Seeding long-text decks...")
  const deckAId = await upsertDeck({
    slug: DECK_A_SLUG,
    title: DECK_A_TITLE,
    description: DECK_A_DESCRIPTION,
    creatorId,
    sourceLangId: enId,
    targetLangId: deId,
    topicSlug: "food",
    cardPairs: DECK_A_CARDS,
  })
  const deckBId = await upsertDeck({
    slug: DECK_B_SLUG,
    title: DECK_B_TITLE,
    description: DECK_B_DESCRIPTION,
    creatorId,
    sourceLangId: enId,
    targetLangId: deId,
    topicSlug: "travel",
    cardPairs: DECK_B_CARDS,
  })

  console.log("Seeding long-text collection...")
  const collectionId = await upsertCollection({
    slug: COLLECTION_SLUG,
    title: COLLECTION_TITLE,
    description: COLLECTION_DESCRIPTION,
    creatorId,
    sourceLangId: enId,
    targetLangId: deId,
    deckIds: [deckAId, deckBId],
  })

  console.log("  " + `collection: ${COLLECTION_SLUG}`)
  console.log("  " + `decks:      ${DECK_A_SLUG}, ${DECK_B_SLUG}`)
  console.log()
  console.log(`Explore (signed out):  http://localhost:3000/explore/collections/${collectionId}`)
  console.log(`Owner path (auth):     http://localhost:3000/collections/${collectionId}`)
  process.exit(0)
}

main().catch((err) => {
  console.error("Long-text seed failed:", err)
  process.exit(1)
})
