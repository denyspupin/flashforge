import { AuthScreen } from "@/components/auth/auth-screen"

type SearchParams = Promise<{ redirect_url?: string }>

export default async function AuthEntryPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { redirect_url } = await searchParams
  return <AuthScreen redirectTo={redirect_url} />
}
