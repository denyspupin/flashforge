import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { cards, collectionDecks, collections, decks, deckTopics } from "@/lib/db/schema"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import { collectionImportRequestSchema } from "@/lib/export-schema"
import { resolveCollectionImport } from "@/lib/export"
import { uniqueCollectionSlug, uniqueSlug } from "@/lib/slug"
import { COLLECTION_EXPORT } from "@/lib/constants"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const user = await requireCurrentUser()

  if (!user) {
    return NextResponse.json(
      errorResponse("Authentication required", "UNAUTHORIZED"),
      { status: 401 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      errorResponse("Invalid JSON body", "VALIDATION_ERROR"),
      { status: 400 }
    )
  }

  const parsed = collectionImportRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      errorResponse("Invalid import payload", "VALIDATION_ERROR"),
      { status: 400 }
    )
  }

  const resolved = await resolveCollectionImport(parsed.data.payload)
  if (!resolved.ok) {
    const parts: string[] = []
    if (resolved.missingLanguages.length) {
      parts.push(
        `Unknown language code(s): ${resolved.missingLanguages.join(", ")}`
      )
    }
    if (resolved.duplicateDeckTitles.length) {
      parts.push(
        `Duplicate deck title(s) in the file: ${resolved.duplicateDeckTitles.join(", ")}`
      )
    }
    return NextResponse.json(
      errorResponse(parts.join(" · "), "VALIDATION_ERROR"),
      { status: 400 }
    )
  }

  const totalCards = resolved.resolved.decks.reduce(
    (sum, d) => sum + d.cards.length,
    0
  )
  if (totalCards > COLLECTION_EXPORT.MAX_IMPORT_CARDS) {
    return NextResponse.json(
      errorResponse(
        `File contains ${totalCards} cards (max ${COLLECTION_EXPORT.MAX_IMPORT_CARDS}).`,
        "VALIDATION_ERROR"
      ),
      { status: 400 }
    )
  }

  const collectionSlug = await uniqueCollectionSlug(resolved.resolved.title)

  const created = await db.transaction(async (tx) => {
    const [collection] = await tx
      .insert(collections)
      .values({
        title: resolved.resolved.title,
        slug: collectionSlug,
        description: resolved.resolved.description,
        creatorId: user.id,
        sourceLanguageId: resolved.resolved.sourceLanguageId,
        targetLanguageId: resolved.resolved.targetLanguageId,
      })
      .returning({ id: collections.id })

    if (!collection) {
      throw new Error("Failed to create collection")
    }

    let position = 0
    let decksCreated = 0
    let cardsCreated = 0

    for (const deck of resolved.resolved.decks) {
      const deckSlug = await uniqueSlug(deck.title, tx)
      const [createdDeck] = await tx
        .insert(decks)
        .values({
          title: deck.title,
          slug: deckSlug,
          description: deck.description,
          sourceLanguageId: resolved.resolved.sourceLanguageId,
          targetLanguageId: resolved.resolved.targetLanguageId,
          creatorId: user.id,
          visibility: "private",
        })
        .returning({ id: decks.id })

      if (!createdDeck) {
        throw new Error("Failed to create deck")
      }

      await tx.insert(collectionDecks).values({
        collectionId: collection.id,
        deckId: createdDeck.id,
        position,
      })

      if (deck.topicIds.length) {
        await tx.insert(deckTopics).values(
          deck.topicIds.map((topicId) => ({
            deckId: createdDeck.id,
            topicId,
          }))
        )
      }

      if (deck.cards.length) {
        const inserted = await tx
          .insert(cards)
          .values(
            deck.cards.map((card) => ({
              deckId: createdDeck.id,
              front: card.front,
              back: card.back,
            }))
          )
          .returning({ id: cards.id })
        cardsCreated += inserted.length
      }

      position += 1
      decksCreated += 1
    }

    return {
      collectionId: collection.id,
      decksCreated,
      cardsCreated,
    }
  })

  return NextResponse.json(successResponse(created))
}
