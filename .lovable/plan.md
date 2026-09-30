# Fix "Sign in failed {}" on login

## What is happening
- The sign-in service timed out (504, after 10–13 seconds) on every password login from app.notiproof.com this morning.
- A direct check of the backend just now also failed: its database connection is unavailable, meaning the backend project is paused, waking up, or overloaded. Sign-in needs the database, so it times out.
- The login page then shows the raw, empty error (`{}`) instead of a helpful message.

## Step 1 — Get the backend healthy (your action, no code)
- Open the Supabase dashboard for project `Notiproofapp` and check its status. If it says Paused, click Restore. If it says Healthy, check the Reports page for database CPU/memory at 100%.
- Once it is up, I re-run the database check to confirm, then test a real login.

## Step 2 — Friendlier error on the login page (code)
- When sign-in fails with an empty message, a timeout, or a 5xx error, show: "We couldn't reach the sign-in service. Please try again in a minute." instead of `{}`.
- Apply the same handling to Register, Forgot password, and Reset password, which use the same pattern.

## Step 3 — Tidy up the stale connection settings
- The app's environment file still points at the old backend (`ewymvxhpkswhsirdrjub`), while the app itself uses the new one (`ykpvxwwhhdzihjphlohh`). The login currently works off the new one, but the mismatch should be fixed by reconnecting the backend in project settings so nothing else points at the old project.

## Technical details
- Auth logs: `POST /token grant_type=password` → 504 `request_timeout`, "context deadline exceeded".
- Pooler read query failed: "connection pooler is unavailable".
- Add a small `friendlyAuthError(error)` helper in `src/lib/` that maps empty `error.message`, `status >= 500`, or `AuthRetryableFetchError` to the friendly text; use it in the auth pages' toasts.
