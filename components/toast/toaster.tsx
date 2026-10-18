"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { CircleAlert, CircleCheck, Info, X } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useEffect } from "react"

import { cn } from "@/lib/utils"
import { useToastStore } from "@/stores"
import type { Toast, ToastVariant } from "@/stores/toast-store"

const VARIANT_ICONS: Record<
  ToastVariant,
  { icon: LucideIcon; className: string }
> = {
  success: { icon: CircleCheck, className: "text-leaf" },
  error: { icon: CircleAlert, className: "text-destructive" },
  info: { icon: Info, className: "text-muted-foreground" },
}

function ToastItem({
  toast,
  dismiss,
}: {
  toast: Toast
  dismiss: (id: string) => void
}) {
  const reduced = useReducedMotion()
  const { id, variant, title, description, duration } = toast
  const { icon: Icon, className: iconClass } = VARIANT_ICONS[variant]

  useEffect(() => {
    const timer = setTimeout(() => dismiss(id), duration)
    return () => clearTimeout(timer)
  }, [id, duration, dismiss])

  return (
    <motion.div
      layout
      initial={
        reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }
      }
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={
        reduced
          ? { opacity: 0 }
          : { opacity: 0, scale: 0.96, transition: { duration: 0.12 } }
      }
      transition={{ duration: 0.25 }}
      className="pointer-events-auto w-full"
    >
      <div
        role={variant === "error" ? "alert" : "status"}
        className="flex items-start gap-2.5 rounded-lg border bg-popover p-3 pr-1.5 text-popover-foreground shadow-lg"
      >
        <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", iconClass)} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => dismiss(id)}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
    </motion.div>
  )
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col items-end gap-2"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} dismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  )
}
