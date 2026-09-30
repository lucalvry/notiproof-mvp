# Security warnings: what they mean and what to fix

There are 53 warnings of 3 kinds. None is a confirmed data leak. Most are "this could be called by someone who shouldn't", so the fix is closing doors we don't use.

## Background
Your database has 48 "privileged helper" functions. They run with extra power so they can check things like plan limits, admin status or team membership. By default, Supabase lets anyone call them through the app's public connection. The scanner flags each one it finds:
- **13 warnings**: callable by visitors who are **not signed in**
- **39 warnings**: callable by **any signed-in user**
- **1 warning**: leaked-password protection is off

## 1. Callable without signing in (13)
**Needed in public, so they stay** (the testimonial collection page uses them, and each one requires a valid secret link token):
- get_collection_context, get_testimonial_request, business_id_for_collection_token, mark_testimonial_request_opened, submit_testimonial_request (3 versions), get_agency_team_invitation (the invite preview page)

**Should NOT be public, so I'll close them to visitors:**
- admin_active_alerts, admin_latest_snapshot, admin_pg_cron_jobs, admin_resolve_alert. These are admin-dashboard tools. They already refuse non-admins inside, so nothing leaked, but visitors shouldn't be able to call them at all.
- accept_agency_team_invitation. It already requires sign-in, so this just closes the door.

## 2. Callable by any signed-in user (39)
**Needed, so they stay**: these power the dashboard, and each one checks inside that you belong to that business or are an admin. Examples: plan usage, analytics, widget limits, create business, accept invite, onboarding complete, admin stats (admin-only inside).

**Internal only, so I'll close them to users** (only the database itself or background jobs use them):
- Background and trigger helpers: handle_new_user, tg_call_campaign_evaluator, tg_call_enrich_product_images, tg_proof_auto_generate_content, sync_proof_product_denorm, update_proof_media_metadata
- Maintenance: cleanup_rate_limits, retry_failed_product_image_enrichment
- check_rate_limit. Right now a signed-in user could call this to use up someone else's request limit. Only our server functions need it.

Before closing each one, I'll check that nothing in the app calls it directly, so no feature breaks.

## 3. Leaked-password protection (1)
This blocks sign-ups using passwords known from public data breaches. Your backend is your own Supabase project, so you switch it on yourself: Supabase dashboard -> Authentication -> Providers -> Email (or Password security) -> turn on "Leaked password protection". Pro plan feature.

## After the fix
- Warnings drop from 53 to roughly 35. The remaining ones are the intended "needed" functions above. I'll mark them as reviewed with a short reason each, so the list stays meaningful.
- Then I'll run a full security scan, which also checks table access rules, and report anything new.
- I'll re-test sign-in, the testimonial collection page and the admin dashboard.

## Technical details
- Migration: `REVOKE EXECUTE ON FUNCTION ... FROM anon` for the 5 functions in section 1; `REVOKE EXECUTE ... FROM anon, authenticated` for the 9 internal ones in section 2. `service_role` and trigger execution are unaffected.
- Pre-check with `rg "rpc\(\"<name>\""` across `src/` and `supabase/functions/` so we don't revoke anything the browser calls. Edge functions use service_role, which isn't affected.
