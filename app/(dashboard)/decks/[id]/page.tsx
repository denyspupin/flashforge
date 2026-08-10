import { DeckDetail } from "@/components/deck/deck-detail"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}

export default async function DeckDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params
  const { from } = await searchParams
  const backHref =
    from && from.startsWith("/") && !from.startsWith("//") ? from : "/decks"

  return <DeckDetail deckId={id} backHref={backHref} />
}