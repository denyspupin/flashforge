import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-md border border-transparent px-2 font-mono-tag text-[10px] uppercase tracking-widest whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "bg-ink/8 text-ink/70 ring-1 ring-inset ring-ink/10 [a]:hover:bg-ink/12 [a]:hover:text-ink",
        secondary:
          "bg-ink/5 text-ink/60 ring-1 ring-inset ring-ink/10 [a]:hover:bg-ink/8 [a]:hover:text-ink/80",
        destructive:
          "bg-destructive/8 text-destructive ring-1 ring-inset ring-destructive/20 focus-visible:ring-destructive/20 dark:bg-destructive/15 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/15",
        outline:
          "border-border/60 text-foreground/80 [a]:hover:bg-muted [a]:hover:text-foreground",
        ghost:
          "text-ink/60 hover:bg-ink/5 hover:text-ink dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        highlight:
          "bg-ember/12 text-ember ring-1 ring-inset ring-ember/25 [a]:hover:bg-ember/18",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
