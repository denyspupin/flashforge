import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import Providers from "@/components/providers"
import { ThemeInitScript } from "@/components/theme/theme-init-script"
import { clerkAppearance } from "@/lib/clerk/appearance"
import { fontSerif, fontMono } from "@/lib/fonts"
import { readThemeCookie } from "@/lib/theme/server"
import { cn } from "@/lib/utils"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "FlashForge — Forge your fluency, one flash at a time",
  description:
    "A vocabulary learning workshop. Build flashcard decks, study with focus, and craft habits that last — one streak at a time.",
}

export const dynamic = "force-dynamic"

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const initialTheme = await readThemeCookie()
  return (
    <ClerkProvider
      appearance={clerkAppearance}
      afterSignOutUrl="/"
    >
      <html
        lang="en"
        className={cn(
          "font-sans",
          geist.variable,
          fontSerif.variable,
          fontMono.variable,
        )}
        suppressHydrationWarning
      >
        <head>
          <ThemeInitScript initialTheme={initialTheme} />
        </head>
        <body className="grain antialiased">
          <Providers initialTheme={initialTheme}>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}
