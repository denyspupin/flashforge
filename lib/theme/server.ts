import { cookies } from "next/headers"
import { DEFAULT_THEME, type Theme } from "@/lib/constants"
import { THEME_COOKIE, isTheme } from "@/lib/theme"

export async function readThemeCookie(): Promise<Theme> {
  try {
    const store = await cookies()
    const value = store.get(THEME_COOKIE)?.value
    if (isTheme(value)) return value
  } catch {
    // cookies() may throw outside of a request scope
  }
  return DEFAULT_THEME
}
