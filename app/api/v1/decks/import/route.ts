import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { cards, deckTopics, decks } from "@/lib/db/schema"
import { successResponse, errorResponse } from "@/lib/api/response"
import { requireCurrentUser } from "@/lib/auth/user"
import { importRequestSchema } from "@/lib/export-schema"
import {
  loadOwnDeck,
  resolveImportReferences,
} from "@/lib/export"
import { uniqueSlug } from "@/lib/slug"

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

  const parsed = importRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      errorResponse("Invalid import payload", "VALIDATION_ERROR"),
      { status: 400 }
    )
  }

  const { payload, target } = parsed.data
  const resolved = await resolveImportReferences(payload)
  if (!resolved.ok) {
    const parts: string[] = []
    if (resolved.missingLanguages.length) {
      parts.push(
        `Unknown language code(s): ${resolved.missingLanguages.join(", ")}`
      )
    }
    if (resolved.missingTopics.length) {
      parts.push(`Unknown topic slug(s): ${resolved.missingTopics.join(", ")}`)
    }
    return NextResponse.json(
      errorResponse(parts.join(" · "), "VALIDATION_ERROR"),
      { status: 400 }
    )
  }

  let deckId: string
  let mode: "new" | "existing"

  if (target.mode === "new") {
    mode = "new"
    const slug = await uniqueSlug(
      payload.deck.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    )

    const [created] = await db
      .insert(decks)
      .values({
        title: payload.deck.title,
        slug,
        description: payload.deck.description ?? null,
        sourceLanguageId: resolved.resolved.sourceLanguageId,
        targetLanguageId: resolved.resolved.targetLanguageId,
        creatorId: user.id,
        visibility: "private",
      })
      .returning()

    if (!created) {
      return NextResponse.json(
        errorResponse("Failed to create deck", "INTERNAL_ERROR"),
        { status: 500 }
      )
    }
    deckId = created.id

    if (resolved.resolved.topicIds.length) {
      await db.insert(deckTopics).values(
        resolved.resolved.topicIds.map((topicId) => ({
          deckId,
          topicId,
        }))
      )
    }
  } else {
    mode = "existing"
    const target_deck = await loadOwnDeck(target.deckId, user.id)
    if (!target_deck) {
      return NextResponse.json(
        errorResponse("Target deck not found", "NOT_FOUND"),
        { status: 404 }
      )
    }
    if (
      target_deck.sourceLanguageId !== resolved.resolved.sourceLanguageId ||
      target_deck.targetLanguageId !== resolved.resolved.targetLanguageId
    ) {
      return NextResponse.json(
        errorResponse(
          "Target deck language pair does not match the import file",
          "VALIDATION_ERROR"
        ),
        { status: 400 }
      )
    }
    deckId = target_deck.id
  }

  let cardsCreated = 0
  if (payload.cards.length) {
    const inserted = await db
      .insert(cards)
      .values(
        payload.cards.map((card) => ({
          deckId,
          front: card.front,
          back: card.back,
        }))
      )
      .returning({ id: cards.id })
    cardsCreated = inserted.length
  }

  return NextResponse.json(
    successResponse({ deckId, mode, cardsCreated })
  )
}
