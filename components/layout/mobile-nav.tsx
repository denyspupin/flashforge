"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { createContext, use, useState, type ReactNode } from "react"
import { Menu, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  icon: ReactNode
  match?: (pathname: string) => boolean
}

function defaultMatch(href: string) {
  return (pathname: string) =>
    pathname === href || pathname.startsWith(`${href}/`)
}

type MobileNavContextValue = {
  close: () => void
}

const MobileNavContext = createContext<MobileNavContextValue | null>(null)

export function useMobileNav(): MobileNavContextValue {
  const ctx = use(MobileNavContext)
  return ctx ?? { close: () => {} }
}

export function MobileNav({
  items,
  brand,
  footer,
}: {
  items: NavItem[]
  brand?: ReactNode
  footer?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const close = () => setOpen(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTitle className="sr-only">Navigation</DialogTitle>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-ink/70 hover:bg-ink/5 hover:text-ink md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <DialogContent className="!flex top-0 right-0 left-auto z-50 h-dvh w-full max-w-xs !flex-col -translate-x-0 -translate-y-0 gap-0 rounded-none border-l border-ink/10 bg-paper p-0 text-left data-open:animate-in data-open:slide-in-from-right data-open:fade-in-0 data-closed:animate-out data-closed:slide-out-to-right data-closed:fade-out-0">
        <MobileNavContext.Provider value={{ close }}>
          <div className="flex items-center justify-between border-b border-ink/8 px-5 py-4">
            {brand ?? <span className="font-display text-lg font-medium">Menu</span>}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-ink/70 hover:bg-ink/5 hover:text-ink"
              onClick={close}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
            {items.map((item) => {
              const active = (item.match ?? defaultMatch(item.href))(pathname)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-ember/10 text-ember"
                      : "text-ink/80 hover:bg-ink/5 hover:text-ink",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      active ? "bg-ember/15 text-ember" : "bg-ink/5 text-ink/70",
                    )}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              )
            })}
          </nav>
          {footer ? (
            <div className="border-t border-ink/8 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          ) : null}
        </MobileNavContext.Provider>
      </DialogContent>
    </Dialog>
  )
}
