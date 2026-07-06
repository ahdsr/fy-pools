import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const filterPillVariants = cva(
  "inline-flex h-[39px] shrink-0 items-center justify-center rounded-full border px-4 text-sm font-medium tracking-[-0.02em] whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        active:
          "border-accent bg-accent text-accent-foreground shadow-[0_12px_28px_color-mix(in_oklch,var(--accent),transparent_82%)] hover:bg-accent/90",
        lime:
          "border-filter-lime/70 bg-filter-lime text-filter-foreground hover:bg-[color-mix(in_oklch,var(--filter-lime),white_18%)]",
        sky:
          "border-filter-sky/70 bg-filter-sky text-filter-foreground hover:bg-[color-mix(in_oklch,var(--filter-sky),white_18%)]",
        coral:
          "border-filter-coral/70 bg-filter-coral text-filter-foreground hover:bg-[color-mix(in_oklch,var(--filter-coral),white_18%)]",
        neutral:
          "border-border bg-white/72 text-foreground hover:bg-white",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
)

function FilterPill({
  className,
  variant = "neutral",
  type = "button",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof filterPillVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="filter-pill"
      data-variant={variant}
      {...(!asChild ? { type } : {})}
      className={cn(filterPillVariants({ variant, className }))}
      {...props}
    />
  )
}

export { FilterPill, filterPillVariants }
