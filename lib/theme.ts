import { THEME_OPTIONS, type Theme } from "@/lib/constants"

export const THEME_STORAGE_KEY = "ff-theme"
export const THEME_COOKIE = "ff_theme"
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

// Paper canvas colors per resolved theme. `<meta name="theme-color">` cannot
// use CSS variables, so the literal values are kept in sync with the --paper
// token in app/globals.css.
export const PAPER_HEX: Record<"light" | "dark", string> = {
  light: "#F3EEE7",
  dark: "#14110F",
}

export const THEME_LABELS: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
}

export const THEME_DESCRIPTIONS: Record<Theme, string> = {
  light: "Always use the light theme.",
  dark: "Always use the dark theme.",
  system: "Match your operating system setting.",
}

export function isTheme(value: unknown): value is Theme {
  return (
    typeof value === "string" &&
    (THEME_OPTIONS as readonly string[]).includes(value)
  )
}

export function isAlwaysLightPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register")
  )
}

export function resolveTheme(
  preference: Theme,
  systemColorScheme: "light" | "dark"
): "light" | "dark" {
  if (preference === "system") return systemColorScheme
  return preference
}

export function readSystemColorScheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

export function applyThemeToDocument(
  preference: Theme,
  systemColorScheme: "light" | "dark"
): "light" | "dark" {
  const resolved = resolveTheme(preference, systemColorScheme)
  const root = document.documentElement
  root.classList.toggle("dark", resolved === "dark")
  root.style.colorScheme = resolved
  return resolved
}

export function forceLightOnDocument() {
  const root = document.documentElement
  root.classList.remove("dark")
  root.style.colorScheme = "light"
}

