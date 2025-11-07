-- =====================================================
-- GA4 Automatic Polling Cron Job Setup
-- =====================================================
-- Run this script in Supabase Dashboard → SQL Editor
-- This enables automatic GA4 data syncing every minute
-- =====================================================

-- Step 1: Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;

-- Step 3: Schedule the cron job to run every minute
SELECT cron.schedule(
  'poll-ga4-campaigns-every-minute',
  '* * * * *', -- Every minute
  $$
  SELECT net.http_post(
    url:='https://ewymvxhpkswhsirdrjub.supabase.co/functions/v1/poll-ga4-campaigns',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3eW12eGhwa3N3aHNpcmRyanViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTY0NDksImV4cCI6MjA3MDU3MjQ0OX0.ToRbUm37-ZnYkmmCfLW7am38rUGgFAppNxcZ2tar9mc"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- Step 4: Verify the cron job was created
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname = 'poll-ga4-campaigns-every-minute';

-- =====================================================
-- Useful Commands for Monitoring
-- =====================================================

-- View all cron jobs:
-- SELECT * FROM cron.job;

-- Check recent cron job runs:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'poll-ga4-campaigns-every-minute')
-- ORDER BY start_time DESC 
-- LIMIT 10;

-- Unschedule the job (if needed):
-- SELECT cron.unschedule('poll-ga4-campaigns-every-minute');

-- Re-enable a job (if disabled):
-- UPDATE cron.job SET active = true WHERE jobname = 'poll-ga4-campaigns-every-minute';
