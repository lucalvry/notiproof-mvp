# Announcements Cron Job Setup

## Prerequisites
1. Enable `pg_cron` and `pg_net` extensions in your Supabase project
2. Go to SQL Editor in Supabase Dashboard

## Installation Steps

### Step 1: Enable Extensions (if not already enabled)
```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Step 2: Create Cron Job
Replace `YOUR_PROJECT_URL` and `YOUR_ANON_KEY` with your actual values before running:

```sql
-- Schedule announcement processor to run every 5 minutes
SELECT cron.schedule(
  'process-announcements',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url:='YOUR_PROJECT_URL/functions/v1/process-announcements',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  ) as request_id;
  $$
);
```

### Step 3: Verify Cron Job
```sql
-- Check if cron job was created
SELECT * FROM cron.job WHERE jobname = 'process-announcements';
```

### Step 4: Test Manually (Optional)
```sql
-- Trigger the cron job manually to test
SELECT cron.schedule_in_database('process-announcements', '* * * * *', $$SELECT 1$$);
```

## Finding Your Credentials

### Project URL
- Go to Supabase Dashboard → Settings → API
- Copy the "Project URL" (looks like: `https://xxxxx.supabase.co`)

### Anon Key
- Go to Supabase Dashboard → Settings → API
- Copy the "anon public" key

## Example (DO NOT USE - Replace with your own)
```sql
SELECT cron.schedule(
  'process-announcements',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/process-announcements',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'::jsonb
  ) as request_id;
  $$
);
```

## Troubleshooting

### Check Cron Job Status
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-announcements')
ORDER BY start_time DESC
LIMIT 10;
```

### Delete Cron Job (if needed)
```sql
SELECT cron.unschedule('process-announcements');
```

### Check Edge Function Logs
Go to Supabase Dashboard → Edge Functions → process-announcements → Logs

## Security Notes
- The anon key is safe to use in cron jobs as it has the same permissions as client-side requests
- The `process-announcements` edge function validates campaign ownership before creating events
- Rate limiting is handled by the widget-api, not the cron job
