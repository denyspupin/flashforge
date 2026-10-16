"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  createContext,
  useEffect,
  useLayoutEffect,
  use,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import { animate, useReducedMotion } from "framer-motion"
import { Menu, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogTitle,
  DialogTrigger,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
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

type GestureState = {
  pointerId: number
  startY: number
  prevY: number
  prevT: number
  velocity: number
  offset: number
  engaged: boolean
}

const DRAG_DISMISS_DISTANCE = 120
const DRAG_DISMISS_VELOCITY = 700
const DRAG_ENGAGE_DISTANCE = 8
const DRAG_UP_RESISTANCE = 0.15

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect

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
  const [isOpen, setOpen] = useState(false)
  const pathname = usePathname()
  const reducedMotion = useReducedMotion()
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const gestureRef = useRef<GestureState | null>(null)
  const exitInFlightRef = useRef(false)
  const animationRef = useRef<ReturnType<typeof animate> | null>(null)
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const entryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const playSheetTo = (y: number, velocity: number, stiffness: number, damping: number) => {
    const el = sheetRef.current
    if (!el) return
    animationRef.current?.cancel()
    animationRef.current = animate(el, { y }, {
      type: "spring",
      stiffness,
      damping,
      velocity,
    })
  }

  const runExit = (velocity = 0) => {
    const el = sheetRef.current
    if (!isOpen || exitInFlightRef.current) return
    if (!el || reducedMotion) {
      setOpen(false)
      return
    }
    exitInFlightRef.current = true
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
    const target = el.offsetHeight + el.getBoundingClientRect().top + 48
    animationRef.current?.cancel()
    animationRef.current = animate(el, { y: target }, {
      type: "spring",
      stiffness: 320,
      damping: 34,
      mass: 0.9,
      velocity,
    })
    void animationRef.current
      .then(() => {
        exitInFlightRef.current = false
        exitTimerRef.current = null
        setOpen(false)
      })
      .catch(() => {})
    exitTimerRef.current = setTimeout(() => {
      if (exitInFlightRef.current) {
        exitInFlightRef.current = false
        setOpen(false)
      }
    }, 1500)
  }

  const close = () => runExit(0)

  const onOpenChange = (next: boolean) => {
    if (next) {
      setOpen(true)
      return
    }
    runExit(0)
  }

  useIsomorphicLayoutEffect(() => {
    if (!isOpen) return
    const el = sheetRef.current
    if (!el) return
    if (reducedMotion) {
      el.style.opacity = "0"
      animationRef.current = animate(el, { opacity: 1 }, {
        duration: 0.18,
        ease: "easeOut",
      })
    } else {
      const startY = el.offsetHeight + 48
      el.style.opacity = "0"
      el.style.transform = `translateY(${startY}px)`
      animationRef.current = animate(el, { y: 0, opacity: 1 }, {
        type: "spring",
        stiffness: 340,
        damping: 36,
      })
    }
    entryTimerRef.current = setTimeout(() => {
      if (el.style.opacity === "0") {
        el.style.opacity = ""
        el.style.transform = ""
      }
    }, 1800)
    return () => {
      if (entryTimerRef.current) {
        clearTimeout(entryTimerRef.current)
        entryTimerRef.current = null
      }
    }
  }, [isOpen, reducedMotion])

  const onSheetPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (exitInFlightRef.current) return
    const target = event.target as HTMLElement
    if (target.closest("[data-sheet-no-drag]")) return
    if (!target.closest("[data-sheet-drag]")) return
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return
    const el = sheetRef.current
    if (!el) return
    gestureRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      prevY: event.clientY,
      prevT: performance.now(),
      velocity: 0,
      offset: 0,
      engaged: false,
    }
    el.setPointerCapture(event.pointerId)
  }

  const onSheetPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    const el = sheetRef.current
    if (!gesture || !el || event.pointerId !== gesture.pointerId) return

    const now = performance.now()
    const dtMs = Math.max(1, now - gesture.prevT)
    const dy = event.clientY - gesture.prevY
    const instant = (dy / dtMs) * 1000
    gesture.velocity = gesture.velocity * 0.75 + instant * 0.25
    gesture.prevY = event.clientY
    gesture.prevT = now

    const total = event.clientY - gesture.startY
    if (!gesture.engaged) {
      if (Math.abs(total) < DRAG_ENGAGE_DISTANCE) return
      gesture.engaged = true
      animationRef.current?.cancel()
      el.style.willChange = "transform"
      el.style.cursor = "grabbing"
    }

    const offset = total < 0 ? total * DRAG_UP_RESISTANCE : total
    gesture.offset = offset
    el.style.transform = `translateY(${offset}px)`
  }

  const onSheetPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current
    const el = sheetRef.current
    if (!gesture || !el || event.pointerId !== gesture.pointerId) return
    gestureRef.current = null
    el.style.willChange = ""
    el.style.cursor = ""
    if (!gesture.engaged) return
    const dismiss =
      gesture.offset >= DRAG_DISMISS_DISTANCE ||
      gesture.velocity >= DRAG_DISMISS_VELOCITY
    if (dismiss) {
      runExit(gesture.velocity)
    } else {
      exitInFlightRef.current = false
      playSheetTo(0, gesture.velocity, 520, 40)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          ref={sheetRef}
          className="fixed bottom-2 left-1/2 top-auto z-50 flex max-h-[85dvh] w-[calc(100%-1rem)] max-w-md -translate-x-1/2 translate-y-0 flex-col gap-0 overflow-hidden rounded-2xl bg-paper p-0 text-left shadow-xl outline-none"
          onPointerDown={onSheetPointerDown}
          onPointerMove={onSheetPointerMove}
          onPointerUp={onSheetPointerEnd}
          onPointerCancel={onSheetPointerEnd}
        >
          <MobileNavContext.Provider value={{ close }}>
            <div
              data-sheet-drag
              className="cursor-grab touch-none select-none pt-2 pb-1"
            >
              <div aria-hidden className="mx-auto h-1 w-9 rounded-full bg-ink/20" />
            </div>
            <div
              data-sheet-drag
              className="flex cursor-grab touch-none select-none items-center justify-between border-b border-ink/8 px-5 py-4"
            >
              {brand ?? <span className="font-display text-lg font-medium">Menu</span>}
              <Button
                variant="ghost"
                size="icon"
                data-sheet-no-drag
                className="h-9 w-9 sm:h-9 sm:w-9 text-ink/70 hover:bg-ink/5 hover:text-ink"
                onClick={close}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {items?.length ? (
              <nav className="flex flex-1 flex-col gap-1 touch-pan-y overscroll-contain overflow-y-auto p-3">
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
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  )
}
