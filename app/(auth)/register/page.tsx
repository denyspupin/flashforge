import { AuthScreen } from "@/components/auth/auth-screen"

type SearchParams = Promise<{ redirect_url?: string }>

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { redirect_url } = await searchParams
  return <AuthScreen initialTab="create-account" redirectTo={redirect_url} />
}
