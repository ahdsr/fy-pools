# FY Pools Design System Baseline

## Selected Direction

The product baseline is **FY Paper Ledger**: a calm, premium, list-first
interface for commissioners and players.

## Brand Principles

- Strong FY Pools wordmark and compact FY mark.
- Ink-blue primary actions.
- White paper surfaces and pale ledger backgrounds.
- Thin bracket-grid rules as the reusable brand motif.
- Table-first and row-first layouts before decorative cards.
- Large readable titles, short labels, and clear primary actions.

## Theme Swap Contract

The root layout sets:

```tsx
<html data-theme="paper-ledger">
```

Theme blocks in `src/app/globals.css` override semantic CSS variables:

```css
html[data-theme="paper-ledger"] { ... }
html[data-theme="command-green"] { ... }
html[data-theme="live-table"] { ... }
```

Components should use semantic Tailwind tokens such as:

- `bg-background`
- `bg-surface-paper`
- `bg-surface-ledger`
- `text-brand-ink`
- `text-brand-mark`
- `border-brand-rule`
- `text-brand-success`

Avoid hard-coded one-off colors in route components unless a new semantic token
is added first.
