import { Fraunces } from "next/font/google"
import { JetBrains_Mono } from "next/font/google"

export const fontSerif = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  axes: ["opsz", "SOFT"],
  display: "swap",
})

export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})
