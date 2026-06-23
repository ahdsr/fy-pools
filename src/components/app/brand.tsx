import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
};

type BrandWordmarkProps = BrandMarkProps & {
  href?: string;
  variant?: "dark" | "light";
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

export function BrandWordmark({
  className,
  href = "/",
  variant = "dark",
}: BrandWordmarkProps) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const logoSrc =
    variant === "light"
      ? `${basePath}/brand/poolwaffle-logo-light.png`
      : `${basePath}/brand/poolwaffle-logo-dark.png`;

  return (
    <Link
      href={href}
      aria-label="PoolWaffle home"
      className={cn(
        "inline-flex items-center transition-opacity hover:opacity-85",
        className,
      )}
    >
      <Image
        src={logoSrc}
        alt="PoolWaffle"
        width={628}
        height={104}
        priority
        className="h-[21px] w-auto sm:h-6"
      />
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
