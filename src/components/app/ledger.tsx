import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/app/section-header";

type LedgerPanelProps = React.ComponentProps<"section"> & {
  title?: string;
  description?: string;
  action?: React.ReactNode;
};

export function LedgerPanel({
  title,
  description,
  action,
  className,
  children,
  ...props
}: LedgerPanelProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border bg-surface-paper text-card-foreground shadow-[0_20px_60px_color-mix(in_oklch,black,transparent_74%)] ring-1 ring-white/5",
        className,
      )}
      {...props}
    >
      {(title || description || action) && (
        <header className="border-b bg-surface-ledger/90 px-5 py-4">
          <SectionHeader
            title={title}
            description={description}
            action={action}
          />
        </header>
      )}
      <div>{children}</div>
    </section>
  );
}

export function LedgerRows({
  children,
  className,
}: React.ComponentProps<"div">) {
  return <div className={cn("divide-y", className)}>{children}</div>;
}

export function LedgerRow({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("px-5 py-4", className)} {...props}>
      {children}
    </div>
  );
}
