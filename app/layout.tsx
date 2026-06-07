import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import Providers from "@/components/providers"
import "./globals.css"
import { cn } from "@/lib/utils"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "FlashForge",
  description: "Master vocabulary with flashcards",
}

export const dynamic = "force-dynamic"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={cn("font-sans", geist.variable)}>
        <body className="antialiased">
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}
