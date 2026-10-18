import CollectionDetail from "@/components/collection/collection-detail"

export default async function PublicCollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ share?: string }>
}) {
  const { share } = await searchParams

  return <CollectionDetail backHref="/explore" shareToken={share} />
}
