# FY Pools

Foundation project for a commissioner-first sports pool product.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase/Postgres migration structure
- Vercel-first app deployment target
- Cloudflare reserved for scheduled result jobs later

## Local Development

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

This setup also supports any available port, for example:

```bash
npm run dev -- --port 3001
```

## Foundation Routes

- `/`
- `/sign-in`
- `/dashboard`
- `/dashboard/pools`
- `/dashboard/templates`
- `/pools/[poolSlug]`
- `/pools/[poolSlug]/leaderboard`
- `/pools/[poolSlug]/make-picks`
- `/pools/[poolSlug]/commissioner`

## Database Direction

The first schema draft is in `supabase/migrations`. It models pools,
memberships, invites, entries, reusable templates, stages, matches, series,
bracket slots, flexible pick items, results, scoring breakdowns, standings,
lock rules, audit events, payouts, and subscriptions.

Flexible pick values live in `entry_pick_items.value` as `jsonb`; core product
entities remain relational.

## Next Feature

Build Template Library v1 before auth polish:

- World Cup Full Predictor
- NBA Playoff Series Bracket

See `docs/next-feature.md`.

## Design System

The selected baseline is **FY Paper Ledger**: ink-blue actions, paper surfaces,
bracket-grid brand rules, and simple row-first layouts. Theme swap support is
based on semantic CSS variables under `html[data-theme]`.

See `docs/design-system.md`.
