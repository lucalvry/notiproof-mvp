# Finish-up: slower scheduled job, new CDN address, customer update email later

## 1. Scheduled job: every 2 minutes and skip when idle
- Move the "dispatch scheduled jobs" timer from every minute to every 2 minutes.
- Before it does any work, the job checks whether anything is due. If nothing is, it stops right away.
- Testimonial emails that are due still go out, just up to 2 minutes later.

## 2. Bunny CDN: cdn.notiproof.xyz
- New uploads: set the upload function's CDN address to `cdn.notiproof.xyz`, so every new photo, video and logo uses it.
- Existing files: none of the saved links use the old .com address. 3 saved images use Bunny's default address (`...b-cdn.net`). Those still work, and I'll switch them to `cdn.notiproof.xyz` so everything matches.
- Widget script: upload the updated `widget.js` (new "powered by" link) to Bunny, after the size and syntax safety checks.
- Test: upload one image and confirm it loads from `https://cdn.notiproof.xyz/...`.

## 3. Customer notice (later, your call)
- No banner or email for now. The install page and widget editor already show the new address automatically, based on the site they're opened on.
- When you're happy with testing, tell me and I'll draft the "please update your widget snippet" email for you to send.

## Technical details
- Cron: `cron.alter_job` on `dispatch-scheduled-jobs-every-minute`, schedule `*/2 * * * *`. In the function, a cheap `select id ... limit 1` on due jobs runs before the main batch, and it returns early when nothing is found.
- Secret: set `BUNNY_CDN_HOSTNAME` to `cdn.notiproof.xyz` with update_secret (secure form), then redeploy `bunny-upload-url`.
- Data: `UPDATE proof_objects SET media_url = regexp_replace(media_url, '^https://[^/]+\.b-cdn\.net', 'https://cdn.notiproof.xyz')` for the matching rows, and the same for the other media columns if any match.
- Widget CDN deploy goes through the existing deployment safety gate.
