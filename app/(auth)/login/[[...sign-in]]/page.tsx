import { SignIn } from "@clerk/nextjs"

type SearchParams = Promise<{ redirect_url?: string }>

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { redirect_url } = await searchParams
  return (
    <SignIn
      path="/login"
      fallbackRedirectUrl={redirect_url || "/dashboard"}
      forceRedirectUrl={redirect_url || undefined}
    />
  )
}
