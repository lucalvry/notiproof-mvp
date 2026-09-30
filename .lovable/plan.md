# Fix login outage + finish the notiproof.com -> notiproof.xyz switch

## 1. Why the backend shows "Unhealthy" (diagnosis)
What I confirmed from the database just now:
- The database's connection gateway keeps dropping in and out (2 of my 4 checks failed with "pooler unavailable"). When it drops, sign-in times out after ~10s -> your "Sign in failed {}" toast.
- A Supabase **file storage upgrade** started at 09:08 (visible in your storage logs as "[Migrations] running for tenant"). It is building an index on the stored-files table and has been **stuck waiting on a lock for 10+ minutes**. The storage health checks around it show "ABORTED REQ".
- This is Supabase's own internal upgrade, not app code. The stuck step is waiting for older open database sessions to finish; some connections have been open for 32 days.

What to do (you, in the Supabase dashboard — I can't restart it from here):
1. Settings -> General -> **Restart project** (or Database -> "Restart server"). This clears the stuck step and the old sessions; the storage upgrade reruns cleanly.
2. If still unhealthy 10 minutes after restart, open a Supabase support ticket quoting: "storage migration `objects_bucket_id_name_version_key` CREATE INDEX CONCURRENTLY stuck on virtualxid lock; pooler intermittently unavailable".
3. Tell me when it's back; I'll re-check the database and do a real login test.

Update after your restart: health is back. The app's own database queries are all fast (the slowest is about 10ms), and nothing was running long when I checked. What still uses CPU:
- The scheduled-task history log has grown to **176 MB** and is never cleaned up. A job runs every minute, plus others every 5 and 15 minutes, and each run adds a row.
- Right after a restart the storage upgrade reruns and the database warms up again, so CPU usually stays high for a short while.

Fixes (database):
- Delete scheduled-task history older than 7 days, and add a nightly job that keeps it trimmed.
- Change the every-minute dispatcher so it skips work when nothing is due, and check whether it can safely run every 2 minutes. This needs your OK.
- Look at CPU again afterwards. If it's still high, I'll point you to the right compute size in Supabase.

App-side fix (code):
- Show a clear message ("We couldn't reach the sign-in service, please try again in a minute") instead of `{}` on Login, Register, Forgot password and Reset password.

## 2. Domain switch: notiproof.com -> notiproof.xyz (not done yet)
Nothing in the app points at notiproof.xyz yet. I will update:
- App address used for sign-in redirects and links: `app.notiproof.com` -> `app.notiproof.xyz`
- Logo link, Terms, Privacy and Contact links on Login/Register/auth screens
- Support email on the Suspended page
- "powered by NotiProof" link inside the website widget
- Testimonial request / reminder / test emails: fallback app link and sender address
- Branded install snippet `app.notiproof.com/widget.js` -> `app.notiproof.xyz/widget.js`

Important for existing customers: sites already using `app.notiproof.com/widget.js` break once .com is gone. If you can still renew or redirect notiproof.com, do it; otherwise every customer must re-paste the new snippet. I'll show a banner on the install page telling them to update.

Things you must do outside the app:
- Vercel: make sure `app.notiproof.xyz` is added to the Vercel project and redeploy after these code changes.
- Supabase: Authentication -> URL Configuration -> Site URL `https://app.notiproof.xyz`, add `https://app.notiproof.xyz/**` to Redirect URLs.
- Google sign-in (Google Cloud console): add `https://app.notiproof.xyz` to Authorized JavaScript origins.
- Email sender (Brevo): verify the `notiproof.xyz` domain and set `BREVO_SENDER_EMAIL` to e.g. `noreply@notiproof.xyz`.
- Stripe: update the success/return URLs of the $29 payment link to the new domain.
- Google Analytics: update the web data stream URL.

## 3. Bunny CDN (you've updated it)
- I'll check the file-upload function uses the new CDN address, and do a test upload.
- I'll update saved image and video links that still use the old .com CDN address so they point to the new one.
- I'll redeploy the widget script to the CDN.

## Technical details
- Evidence: `pg_stat_activity` shows `supabase_storage_admin` running `CREATE UNIQUE INDEX CONCURRENTLY objects_bucket_id_name_version_key` for 10m, `wait_event=virtualxid`; auth `/token` 504 `request_timeout`.
- New `friendlyAuthError()` helper in `src/lib/`; `APP_URL` in `src/lib/app-url.ts`; hardcoded .com in `AuthLayout`, `Login`, `Register`, `Suspended`, `Email.tsx`, `public/widget.js`, and `send-testimonial-request`, `send-testimonial-reminders`, `send-test-email` functions.
- The widget script must be redeployed to the CDN after its footer link changes (deployment safety checks still apply).
- Data rewrite of stored `.com` CDN URLs via a targeted update after confirming which columns contain them.
