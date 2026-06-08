import { SignUp } from "@clerk/nextjs"

type SearchParams = Promise<{ redirect_url?: string }>

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { redirect_url } = await searchParams
  return (
    <SignUp
      path="/register"
      fallbackRedirectUrl={redirect_url || "/dashboard"}
      forceRedirectUrl={redirect_url || undefined}
    />
  )
}
