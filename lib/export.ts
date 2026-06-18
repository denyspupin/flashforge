import { and, asc, eq, inArray } from "drizzle-orm"

import { db } from "@/lib/db/client"
import {
  cards,
  deckTopics,
  decks,
  languages,
  topics,
} from "@/lib/db/schema"
import { DECK_EXPORT } from "@/lib/constants"
import type {
  CollectionImportPayload,
  ImportPayload,
} from "@/lib/export-schema"

export type ResolvedImport = {
  sourceLanguageId: string
  targetLanguageId: string
  topicIds: string[]
}

export type ResolveResult =
  | { ok: true; resolved: ResolvedImport }
  | { ok: false; missingLanguages: string[]; missingTopics: string[] }

export type ResolvedCollectionDeck = {
  title: string
  description: string | null
  topicIds: string[]
  cards: { front: string; back: string }[]
}

export type ResolvedCollectionImport = {
  title: string
  description: string | null
  sourceLanguageId: string
  targetLanguageId: string
  decks: ResolvedCollectionDeck[]
}

export type CollectionResolveResult =
  | { ok: true; resolved: ResolvedCollectionImport }
  | {
      ok: false
      missingLanguages: string[]
      missingTopics: string[]
      duplicateDeckTitles: string[]
    }

export async function buildExportPayload(
  deckId: string
): Promise<ImportPayload | null> {
  const deckRows = await db
    .select()
    .from(decks)
    .where(eq(decks.id, deckId))

  if (!deckRows.length) return null
  const deck = deckRows[0]

  const [sourceLangRows, targetLangRows] = await Promise.all([
    db.select().from(languages).where(eq(languages.id, deck.sourceLanguageId)),
    db.select().from(languages).where(eq(languages.id, deck.targetLanguageId)),
  ])

  if (!sourceLangRows.length || !targetLangRows.length) return null

  const deckTopicRelations = await db
    .select({ topicId: deckTopics.topicId })
    .from(deckTopics)
    .where(eq(deckTopics.deckId, deckId))

  const topicIds = deckTopicRelations.map((t) => t.topicId)
  const topicRows = topicIds.length
    ? await db
        .select({ slug: topics.slug })
        .from(topics)
        .where(inArray(topics.id, topicIds))
    : []

  const cardRows = await db
    .select({ front: cards.front, back: cards.back })
    .from(cards)
    .where(eq(cards.deckId, deckId))
    .orderBy(asc(cards.createdAt))

  return {
    format: DECK_EXPORT.FORMAT,
    formatVersion: DECK_EXPORT.FORMAT_VERSION,
    generator: DECK_EXPORT.GENERATOR,
    exportedAt: new Date().toISOString(),
    deck: {
      title: deck.title,
      description: deck.description,
      visibility: deck.visibility,
      sourceLanguage: sourceLangRows[0].code,
      targetLanguage: targetLangRows[0].code,
      topics: topicRows.map((t) => t.slug),
    },
    cards: cardRows,
  }
}

export async function resolveImportReferences(
  payload: ImportPayload
): Promise<ResolveResult> {
  const langCodes = [payload.deck.sourceLanguage, payload.deck.targetLanguage]
  const langRows = await db
    .select({ id: languages.id, code: languages.code })
    .from(languages)
    .where(inArray(languages.code, langCodes))

  const langByCode = Object.fromEntries(langRows.map((l) => [l.code, l.id]))
  const missingLanguages = langCodes.filter((c) => !langByCode[c])

  let topicIds: string[] = []
  const missingTopics: string[] = []
  if (payload.deck.topics.length) {
    const topicRows = await db
      .select({ id: topics.id, slug: topics.slug })
      .from(topics)
      .where(inArray(topics.slug, payload.deck.topics))

    const topicBySlug = Object.fromEntries(topicRows.map((t) => [t.slug, t.id]))
    missingTopics.push(
      ...payload.deck.topics.filter((s) => !topicBySlug[s])
    )
    topicIds = payload.deck.topics
      .map((s) => topicBySlug[s])
      .filter((id): id is string => Boolean(id))
  }

  if (missingLanguages.length || missingTopics.length) {
    return { ok: false, missingLanguages, missingTopics }
  }

  return {
    ok: true,
    resolved: {
      sourceLanguageId: langByCode[payload.deck.sourceLanguage],
      targetLanguageId: langByCode[payload.deck.targetLanguage],
      topicIds,
    },
  }
}

export async function resolveCollectionImport(
  payload: CollectionImportPayload
): Promise<CollectionResolveResult> {
  const langCodes = [payload.collection.sourceLanguage, payload.collection.targetLanguage]
  const langRows = await db
    .select({ id: languages.id, code: languages.code })
    .from(languages)
    .where(inArray(languages.code, langCodes))

  const langByCode = Object.fromEntries(langRows.map((l) => [l.code, l.id]))
  const missingLanguages = langCodes.filter((c) => !langByCode[c])

  const allTopicSlugs = Array.from(
    new Set(payload.decks.flatMap((d) => d.topics))
  )
  const topicBySlug: Record<string, string> = {}
  const missingTopics: string[] = []
  if (allTopicSlugs.length) {
    const topicRows = await db
      .select({ id: topics.id, slug: topics.slug })
      .from(topics)
      .where(inArray(topics.slug, allTopicSlugs))
    for (const row of topicRows) {
      topicBySlug[row.slug] = row.id
    }
    for (const slug of allTopicSlugs) {
      if (!topicBySlug[slug]) missingTopics.push(slug)
    }
  }

  const titleCounts = new Map<string, number>()
  for (const d of payload.decks) {
    titleCounts.set(d.title, (titleCounts.get(d.title) ?? 0) + 1)
  }
  const duplicateDeckTitles = Array.from(titleCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([title]) => title)

  if (
    missingLanguages.length ||
    missingTopics.length ||
    duplicateDeckTitles.length
  ) {
    return { ok: false, missingLanguages, missingTopics, duplicateDeckTitles }
  }

  const decks: ResolvedCollectionDeck[] = payload.decks.map((d) => ({
    title: d.title,
    description: d.description ?? null,
    topicIds: d.topics
      .map((slug) => topicBySlug[slug])
      .filter((id): id is string => Boolean(id)),
    cards: d.cards,
  }))

  return {
    ok: true,
    resolved: {
      title: payload.collection.title,
      description: payload.collection.description ?? null,
      sourceLanguageId: langByCode[payload.collection.sourceLanguage],
      targetLanguageId: langByCode[payload.collection.targetLanguage],
      decks,
    },
  }
}

export async function loadOwnDeck(deckId: string, userId: string) {
  const rows = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.creatorId, userId)))
  return rows[0] ?? null
}


