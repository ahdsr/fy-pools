import Link from "next/link";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "grid size-9 place-items-center rounded-lg border bg-surface-paper text-[0.68rem] font-bold tracking-normal text-primary shadow-sm ring-1 ring-primary/15",
        className,
      )}
    >
      FY
    </div>
  );
}

export function BrandWordmark({ className }: BrandMarkProps) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2.5 font-normal", className)}
    >
      <BrandMark />
      <span className="text-base tracking-normal text-brand-ink">FY Pools</span>
    </Link>
  );
}

export function BracketGridMark({ className }: BrandMarkProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "grid grid-cols-3 gap-1 rounded-lg border border-brand-rule/50 bg-surface-paper p-2",
        className,
      )}
    >
      {Array.from({ length: 9 }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "h-1.5 rounded-full bg-brand-rule",
            index === 0 || index === 4 || index === 8
              ? "bg-brand-mark"
              : "bg-brand-rule/55",
          )}
        />
      ))}
    </div>
  );
}
