import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const filterPillVariants = cva(
  "inline-flex h-10 shrink-0 items-center justify-center rounded-full border px-5 text-base font-semibold whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        active:
          "border-cta-green bg-cta-green text-cta-green-foreground shadow-[0_12px_28px_color-mix(in_oklch,var(--cta-green),transparent_78%)] hover:bg-[color-mix(in_oklch,var(--cta-green),black_8%)]",
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
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof filterPillVariants>) {
  return (
    <button
      data-slot="filter-pill"
      data-variant={variant}
      type={type}
      className={cn(filterPillVariants({ variant, className }))}
      {...props}
    />
  )
}

export { FilterPill, filterPillVariants }
