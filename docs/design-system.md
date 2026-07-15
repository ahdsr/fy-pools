# FY Pools Design System Baseline

## Selected Direction

The product baseline is **FIFA Table**: a crisp, list-first interface for
commissioners and players, built from hard rectangular surfaces and simple data rows.

## Brand Principles

- Strong FY Pools wordmark and compact FY mark.
- Black primary actions with high-contrast labels.
- Neutral gray page canvases with white paper rows and panels.
- Thin gray rules and a bold header baseline as the reusable table motif.
- Table-first and row-first layouts before decorative cards or gradients.
- Square corners, restrained shadows, and clear whitespace between rows.
- Large readable titles, short labels, and clear primary actions.

## Theme Swap Contract

The root layout sets:

```tsx
<html data-theme="premium-pools">
```

Theme blocks in `src/app/globals.css` override semantic CSS variables:

```css
html[data-theme="premium-pools"] { ... }
html[data-theme="command-green"] { ... }
html[data-theme="live-table"] { ... }
html[data-theme="dark-pools"] { ... }
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
