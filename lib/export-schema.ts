import { z } from "zod"
import { DECK_EXPORT } from "@/lib/constants"

export const importPayloadSchema = z.object({
  format: z.literal(DECK_EXPORT.FORMAT),
  formatVersion: z.literal(DECK_EXPORT.FORMAT_VERSION),
  generator: z.string().optional(),
  exportedAt: z.string().datetime().optional(),
  deck: z.object({
    title: z.string().min(1).max(256),
    description: z.string().nullable().optional(),
    visibility: z.enum(["private", "public"]).optional(),
    sourceLanguage: z.string().min(2).max(16),
    targetLanguage: z.string().min(2).max(16),
    topics: z.array(z.string().min(1).max(256)).default([]),
  }),
  cards: z
    .array(
      z.object({
        front: z.string().min(1),
        back: z.string().min(1),
      })
    )
    .max(DECK_EXPORT.MAX_IMPORT_CARDS),
})

export type ImportPayload = z.infer<typeof importPayloadSchema>

export const importRequestSchema = z.object({
  payload: importPayloadSchema,
  target: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("new") }),
    z.object({ mode: z.literal("existing"), deckId: z.string().uuid() }),
  ]),
})

export type ImportRequest = z.infer<typeof importRequestSchema>
