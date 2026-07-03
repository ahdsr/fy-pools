# Auth

Supabase Auth is the MVP identity layer for commissioners and invited
participants.

## Current Flow

- `/sign-up` creates an email/password Supabase user. If Supabase returns an
  immediate session, the matching `profiles` row is created with the submitted
  display name.
- `/sign-in` signs in with email/password, ensures a matching `profiles` row
  exists, and redirects to a sanitized `next` path, defaulting to `/dashboard`.
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
