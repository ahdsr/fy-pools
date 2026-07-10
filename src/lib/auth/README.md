# Auth

Supabase Auth is the MVP identity layer for commissioners and invited
participants.

## Current Flow

- `/sign-up` creates an email/password Supabase user and passes
  `/auth/callback` as its confirmation redirect. When confirmation is required,
  users see `/sign-up/check-email` until they open that link. If Supabase
  returns an immediate session (such as local development with confirmations
  disabled), the matching `profiles` row is created with the submitted display
  name and the user is redirected immediately.
- `/sign-in` signs in with email/password, ensures a matching `profiles` row
  exists, and redirects to a sanitized `next` path, defaulting to
  `/dashboard`. The dashboard routes commissioners with no pools to
  `/dashboard/pools` to begin setup.
- Both password forms offer Google sign-in. Google starts PKCE OAuth in the
  browser and returns through `/auth/callback`, which exchanges the code,
  creates the profile when needed, and redirects to the same sanitized
  destination.
- `/auth/callback` exchanges Supabase email-confirmation codes, ensures a
  matching `profiles` row exists, and redirects to a sanitized `next` path.
- `/dashboard/*` routes are protected in `proxy.ts`; signed-out requests are
  redirected to `/sign-in?next=<original-dashboard-path>`.
- `/join/<invite-code>` remains public so invited participants can see the pool
  invite and then sign in or create an account with `next` pointing back to the
  invite.

## Error Handling

Auth actions return form-level messages for missing fields, short passwords,
Supabase sign-in/sign-up failures, missing Supabase configuration, and profile
creation failures. Redirects are kept outside caught Supabase operations so
Next.js can complete Server Action redirects correctly.

## Security Notes

`safeNextPath` rejects external URLs, protocol-relative URLs, auth-loop targets,
and callback-loop targets before any auth redirect is used. Browser Supabase
usage remains limited to session state and sign-out; data mutations continue to
go through server code.

## Provider Configuration

- Keep email confirmation enabled in production. The confirmation email must
  use Supabase's `{{ .ConfirmationURL }}` so the per-signup callback URL is
  preserved.
- Allow `/auth/callback?next=...` on production, local, and approved Vercel
  preview origins in Supabase Auth's Redirect URLs. `next` is always sanitized
  before it is sent to Supabase or used in a redirect.
- Enable the Google provider in Supabase with the Google Cloud web-client ID and
  secret. In Google Cloud, allow the application origins and use the Supabase
  project's `/auth/v1/callback` URL as the authorized redirect URI.
