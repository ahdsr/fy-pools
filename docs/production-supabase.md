# Production Supabase Setup

This runbook is the P0 setup contract for the private MVP launch. It covers a
fresh Supabase project, the environment variables required by the app, migration
application, the current RLS posture, and how the first commissioner account is
bootstrapped.

## Required Environment

Set these values in the production app host, such as Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
SUPABASE_SERVICE_ROLE_KEY=
FY_POOLS_SCORING_API_KEY=
```

Use the values from the target Supabase project's API settings. The service role
key must stay server-only and must not be exposed to browser code, client
components, logs, analytics, or public build output.
Set `NEXT_PUBLIC_SITE_URL` to the canonical production origin, for example
`https://fy-pools.vercel.app`, so auth emails use a stable callback host.
Set `FY_POOLS_SCORING_API_KEY` to a high-entropy secret used by trusted scoring
jobs when calling the Round of 16 scoring refresh API.

Optional runtime variables:

```bash
NEXT_PUBLIC_BASE_PATH=
FY_POOLS_LOCAL_RESULTS_JOB=
FY_POOLS_LOCAL_RESULTS_REFRESH_MS=
```

`NEXT_PUBLIC_BASE_PATH` is only needed when the app is served from a path
prefix. When it is set, every Supabase redirect allow-list entry must include
that same prefix (for example,
`https://<production-domain>/<base-path>/auth/callback?next=**`).
`FY_POOLS_LOCAL_RESULTS_JOB=1` enables the local fixture refresh loop for
development, and `FY_POOLS_LOCAL_RESULTS_REFRESH_MS` controls that local loop
interval. Do not enable the local fixture job in production.

The Stripe and Resend variables in `.env.example` are reserved for later launch
work. They are not required for the Round of 16 MVP flow unless payments or
automated email sending are explicitly added back to the launch scope.

## World Cup Score Refresh

GitHub Actions calls `/api/world-cup/results/refresh` every five minutes in
production. Configure these repository secrets:

- `WORLD_CUP_REFRESH_URL`: `https://fy-pools.vercel.app/api/world-cup/results/refresh`
- `WORLD_CUP_CRON_SECRET`: the same value as Vercel's production `CRON_SECRET`

The workflow is used because Vercel Hobby only supports daily cron jobs.

When a visitor is actively viewing a World Cup pool page, the app also refreshes
the FIFA-backed result snapshot on demand. During a match window, visible tabs
ask for an update every 30 seconds; Supabase grants only one refresh across all
viewers. Outside a match window, a visit can refresh a snapshot no more than
once every 15 minutes. This is a fallback, not the production scheduler.

Only a complete FIFA refresh replaces the existing snapshot, so a transient
provider failure cannot overwrite the last known scores. Apply the
`public_result_refresh_leases` migration before deploying this change.

## F1 Event-Catalog Refresh

The Event Catalog prepares commissioner setup with a persisted Formula 1
schedule and driver roster from Jolpica. GitHub Actions calls
`/api/events/f1/refresh` every six hours; schedule data changes infrequently,
and a saved snapshot remains usable while the provider is unavailable.

Configure these repository secrets:

- `F1_EVENT_CATALOG_REFRESH_URL`: `https://fy-pools.vercel.app/api/events/f1/refresh`
- `F1_EVENT_CATALOG_CRON_SECRET`: the same production value as `CRON_SECRET`

The endpoint accepts an optional `?season=YYYY` for a controlled catch-up
refresh. It uses `CRON_SECRET` and cannot be called anonymously in production.
Snapshots expire after 36 hours and are visibly marked as needing refresh.
Jolpica's season-driver endpoint does not prove a particular race's entries,
so F1 setup is marked **provisional** until an event-specific source can
confirm the field. The preview deliberately does not publish a pool from that
provisional roster.

## Supabase Project Checklist

1. Create a new production Supabase project.
2. In Supabase Auth, enable email/password signups for the private MVP test
   group, require email confirmation, require recent reauthentication for
   password changes, and set the minimum password length to at least 8
   characters.
3. Add production auth redirect URLs:
   - `https://<production-domain>/auth/callback?next=**` (or
     `https://<production-domain>/<base-path>/auth/callback?next=**` when
     `NEXT_PUBLIC_BASE_PATH` is set)
   - matching `/auth/callback?next=**` URLs for localhost and approved Vercel
     preview domains.
   - The callback URL is the only application redirect target used by password
     confirmation, recovery, and Google OAuth; the app sanitizes `next` before
     redirecting internally.
4. Configure the site URL to the production domain.
5. Verify that the confirmation and password-recovery templates use
   `{{ .ConfirmationURL }}` and route back through `/auth/callback`.
6. Enable Google in Supabase Auth. Configure a Google OAuth web client with the
   production and local JavaScript origins and the Supabase project's
   `/auth/v1/callback` URL as its authorized redirect URI, then add its client
   ID and secret to the Supabase Google provider settings.

## Migration Application

The source of truth is `supabase/migrations`.

For a fresh linked project:

```bash
npx supabase@latest login
npx supabase@latest link --project-ref <project-ref>
npx supabase@latest db push
```

For a local throwaway validation database, use the Supabase CLI with Docker:

```bash
npx supabase@latest start
npx supabase@latest db reset
```

The CLI is intentionally invoked through `npx supabase@latest` because this repo
does not require a globally installed `supabase` binary.

After applying migrations, verify these schema facts before launch:

- Core enum types exist: `member_role`, `invite_status`, `pool_status`,
  `pick_status`, `lock_scope`, and `pick_type`.
- Core tables exist: `profiles`, `pools`, `pool_members`, `pool_invites`,
  `entries`, `entry_picks`, `entry_pick_items`, `score_breakdowns`,
  `standings_snapshots`, `public_result_snapshots`,
  `public_result_refresh_leases`,
  `commissioner_notifications`, and `api_rate_limit_buckets`.
  Event-backed setup also uses `event_catalog_snapshots`.
- RLS is enabled on every table in the `public` schema.
- Direct `anon` and `authenticated` table privileges are revoked. Any future
  browser-read surface must add both a narrow policy and the matching table
  grant for that exact route.
- `commissioner_notifications` has the recipient read policy from the
  participant-flow migration, but direct client access remains unavailable
  until a future migration grants the required table privileges.

## MVP Security Model

The MVP app uses Supabase in two distinct ways:

- Browser Supabase clients are for auth/session state only.
- Pool, invite, entry, pick, notification, scoring, and standings data access
  goes through server code and Server Actions.
- Server mutations use `SUPABASE_SERVICE_ROLE_KEY`, guarded by app-level checks
  such as `getSupabaseUser()` and invite-code validation.
- Trusted scoring refreshes use `FY_POOLS_SCORING_API_KEY` and the durable
  `consume_api_rate_limit` database function to keep request limits consistent
  across server instances.
- Public World Cup score pages read durable result snapshots from
  `public_result_snapshots`. The viewer-driven refresh endpoint updates that
  table through a durable lease, so concurrent public page requests never
  trigger duplicate live-provider refreshes.
- RLS remains enabled on every `public` table. Direct anon/authenticated table
  access remains denied unless a later task adds a narrow, reviewed policy and
  matching table grant for a specific browser-read surface.

Do not add broad `authenticated` policies for launch convenience. If a later P0
requires direct client reads, add the minimum policy needed for that exact table
and route, and document the route-level behavior in this file.

## First Commissioner Bootstrap

There is no global admin role in the MVP.

1. The first commissioner creates an account at `/sign-up`.
2. The sign-up action writes or updates that user's row in `profiles`.
3. The commissioner opens `/dashboard/pools/new` and publishes a Round of 16
   pool.
4. Publishing creates the pool with `pools.owner_id` set to that commissioner.
5. Participant links are generated from `pool_invites.code` and shared manually.

The commissioner must confirm their email before signing in and publishing the
first pool.

## Launch Smoke Test Prerequisites

Before marking the Supabase setup blocker complete:

1. Apply migrations to a fresh production or throwaway Supabase project.
2. Set the required Supabase and scoring API variables in the deployed app environment.
3. Create a commissioner account from `/sign-up`.
4. Publish a Round of 16 pool with at least one participant email.
5. Open a generated `/join/<invite-code>` link in a signed-out session.
6. Create or sign into the participant account, submit picks, and verify the
   commissioner inbox receives the submission notification.
7. Open `/pools/<pool-slug>` and verify the published Round of 16 pool renders
   from Supabase data with public stats, bracket state, entrants, and viewer
   entry context when available.
