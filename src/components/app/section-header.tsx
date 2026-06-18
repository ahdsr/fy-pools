import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function SectionHeader({
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="prose max-w-2xl prose-h2:my-0 prose-h2:text-2xl prose-h2:font-bold prose-h2:tracking-[0.005em] prose-h2:text-brand-ink prose-p:mb-0 prose-p:mt-2 prose-p:text-base prose-p:font-normal prose-p:leading-7 prose-p:text-muted-foreground">
        {title && <h2>{title}</h2>}
        {description && <p>{description}</p>}
      </div>
      {action && <div className="not-prose shrink-0">{action}</div>}
    </div>
  );
}
