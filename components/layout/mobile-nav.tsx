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
  DialogTrigger,
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
  trigger,
}: {
  items?: NavItem[]
  brand?: ReactNode
  footer?: ReactNode
  trigger?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const close = () => setOpen(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTitle className="sr-only">Navigation</DialogTitle>
      {trigger ? (
        <DialogTrigger render={<span className="contents" />}>
          {trigger}
        </DialogTrigger>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 sm:h-9 sm:w-9 text-ink/70 hover:bg-ink/5 hover:text-ink md:hidden"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
      <DialogContent className="!flex bottom-2 top-auto z-50 max-h-[85dvh] w-[calc(100%-1rem)] max-w-md !flex-col translate-y-0 gap-0 rounded-2xl bg-paper p-0 text-left shadow-xl outline-none data-open:animate-in data-open:slide-in-from-bottom-1/2 data-open:fade-in-0 data-closed:animate-out data-closed:slide-out-to-bottom-1/2 data-closed:fade-out-0">
        <MobileNavContext.Provider value={{ close }}>
          <div
            aria-hidden
            className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-ink/20"
          />
          <div className="flex items-center justify-between border-b border-ink/8 px-5 py-4">
            {brand ?? <span className="font-display text-lg font-medium">Menu</span>}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 sm:h-9 sm:w-9 text-ink/70 hover:bg-ink/5 hover:text-ink"
              onClick={close}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          {items?.length ? (
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
          ) : (
            <div className="flex-1" />
          )}
          {footer ? (
            <div className="border-t border-ink/8 px-3 pt-3 pb-3">
              {footer}
            </div>
          ) : null}
        </MobileNavContext.Provider>
      </DialogContent>
    </Dialog>
  )
}
