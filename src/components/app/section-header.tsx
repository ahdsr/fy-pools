import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  title?: React.ReactNode;
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
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="prose max-w-2xl prose-h2:my-0 prose-h2:text-xl prose-h2:font-bold prose-h2:tracking-normal prose-h2:text-brand-ink prose-p:mb-0 prose-p:mt-2 prose-p:text-[0.9375rem] prose-p:font-normal prose-p:leading-6 prose-p:text-muted-foreground sm:prose-h2:text-2xl sm:prose-p:text-sm">
        {title && <h2>{title}</h2>}
        {description && <p>{description}</p>}
      </div>
      {action && <div className="not-prose shrink-0">{action}</div>}
    </div>
  );
}
