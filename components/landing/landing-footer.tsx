import Link from "next/link"
import { Separator } from "@/components/garn/separator"
import { Wordmark } from "@/components/layout/wordmark"

export function LandingFooter() {
  return (
    <footer className="relative">
      <div className="mx-auto max-w-[1280px] px-6 py-16 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_2fr]">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-xs text-pretty text-sm leading-relaxed text-muted-foreground">
              A vocabulary workshop, quietly running. Built for people who
              would rather learn than be sold to.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <FooterCol
              title="Learn"
              links={[
                { label: "Explore decks", href: "/explore" },
                { label: "How it works", href: "/#process" },
                { label: "Streaks & XP", href: "/#gamification" },
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

        <Separator className="mt-16" />
        <div className="flex flex-col items-end justify-end gap-4 pt-8 font-mono text-xs uppercase tracking-wider text-muted-foreground sm:flex-row sm:items-center">
          <span>
            © {new Date().getFullYear()} FlashForge · A quiet workshop
          </span>
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
      <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        — {title}
      </h4>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}