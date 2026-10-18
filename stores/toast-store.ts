import { create } from "zustand"

export type ToastVariant = "success" | "error" | "info"

export type ToastInput = {
  title: string
  description?: string
  duration?: number
}

export type Toast = ToastInput & {
  id: string
  variant: ToastVariant
  duration: number
}

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: 4000,
  error: 6000,
  info: 4000,
}

const MAX_VISIBLE = 4

type ToastState = {
  toasts: Toast[]
  push: (variant: ToastVariant, input: ToastInput) => string
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  push: (variant, input) => {
    const id = crypto.randomUUID()
    const toast: Toast = {
      id,
      variant,
      duration: input.duration ?? DEFAULT_DURATIONS[variant],
      title: input.title,
      description: input.description,
    }
    set((state) => ({
      toasts: [
        ...state.toasts
          .filter(
            (existing) =>
              !(existing.variant === variant && existing.title === toast.title)
          )
          .slice(-(MAX_VISIBLE - 1)),
        toast,
      ],
    }))
    return id
  },

  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}))

export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().push("success", { title, description }),
  error: (title: string, description?: string) =>
    useToastStore.getState().push("error", { title, description }),
  info: (title: string, description?: string) =>
    useToastStore.getState().push("info", { title, description }),
}
