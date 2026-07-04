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
SUPABASE_SERVICE_ROLE_KEY=
FY_POOLS_SCORING_API_KEY=
```

Use the values from the target Supabase project's API settings. The service role
key must stay server-only and must not be exposed to browser code, client
components, logs, analytics, or public build output.
Set `FY_POOLS_SCORING_API_KEY` to a high-entropy secret used by trusted scoring
jobs when calling the Round of 16 scoring refresh API.

The Stripe and Resend variables in `.env.example` are reserved for later launch
work. They are not required for the Round of 16 MVP flow unless payments or
automated email sending are explicitly added back to the launch scope.

## Supabase Project Checklist

1. Create a new production Supabase project.
2. In Supabase Auth, enable email/password signups for the private MVP test
   group, require email confirmation, require recent reauthentication for
   password changes, and set the minimum password length to at least 8
   characters.
3. Add production auth redirect URLs:
   - `https://<production-domain>/auth/callback`
   - `https://<production-domain>/sign-in`
   - `https://<production-domain>/sign-up`
   - `https://<production-domain>/join/*` when wildcard redirects are allowed.
4. Configure the site URL to the production domain.
5. Verify that confirmation and password-recovery email template links route
   back through `/auth/callback`.
6. Keep provider OAuth settings disabled unless they are intentionally added in a
   later auth-readiness pass.

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
  `standings_snapshots`, and `commissioner_notifications`.
- RLS is enabled on the core app tables listed above.
- `commissioner_notifications` has the recipient read policy from the
  participant-flow migration.

## MVP Security Model

The MVP app uses Supabase in two distinct ways:

- Browser Supabase clients are for auth/session state only.
- Pool, invite, entry, pick, notification, scoring, and standings data access
  goes through server code and Server Actions.
- Server mutations use `SUPABASE_SERVICE_ROLE_KEY`, guarded by app-level checks
  such as `getSupabaseUser()` and invite-code validation.
- RLS remains enabled on core tables. Direct anon/authenticated table access
  should remain denied unless a later task adds a narrow, reviewed policy for a
  specific browser-read surface.

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

The public `/pools/<pool-slug>` route is still a separate P0 blocker because it
currently reads demo fixture data rather than newly published Supabase pools.
