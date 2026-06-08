import Link from "next/link"
import { Wordmark } from "@/components/layout/wordmark"

export function LandingFooter() {
  return (
    <footer className="relative">
      <div className="mx-auto max-w-[1280px] px-6 py-16 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_2fr]">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-xs text-pretty text-sm leading-relaxed text-ink/55">
              A vocabulary workshop, quietly running. Built for people who
              would rather learn than be sold to.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <FooterCol
              title="Learn"
              links={[
                { label: "Explore decks", href: "/explore" },
                { label: "How it works", href: "#process" },
                { label: "Streaks & XP", href: "#gamification" },
              ]}
            />
            <FooterCol
              title="Account"
              links={[
                { label: "Sign in", href: "/login" },
                { label: "Get started", href: "/register" },
                { label: "Profile", href: "/profile" },
              ]}
            />
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-ink/10 pt-8 text-xs text-ink/45 sm:flex-row sm:items-center">
          <span className="font-mono-tag uppercase tracking-wider">
            © {new Date().getFullYear()} FlashForge · A quiet workshop
          </span>
          <div className="flex items-center gap-2 font-mono-tag uppercase tracking-wider">
            <span className="h-1.5 w-1.5 animate-ember-pulse rounded-full bg-ember" />
            All systems glowing
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({
  title,
  links,
}: {
  title: string
  links: { label: string; href: string }[]
}) {
  return (
    <div>
      <h4 className="font-mono-tag text-[10px] uppercase tracking-[0.2em] text-ink/45">
        — {title}
      </h4>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-sm text-ink/70 transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
