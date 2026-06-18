type PlaceholderItem = {
  title: string;
  body: string;
};

export function PlaceholderGrid({ items }: { items: PlaceholderItem[] }) {
  return (
    <section className="grid gap-5 md:grid-cols-3">
      {items.map((item) => (
        <div key={item.title} className="space-y-2 border-t pt-5">
          <h2 className="text-xl font-bold tracking-[0.005em] text-brand-ink">
            {item.title}
          </h2>
          <p className="text-sm font-normal leading-6 text-muted-foreground">
            {item.body}
          </p>
        </div>
      ))}
    </section>
  );
}
