-- Fix 1: trial_email_notifications - policy applies to public instead of service_role
DROP POLICY IF EXISTS "Service role can manage trial notifications" ON trial_email_notifications;
CREATE POLICY "Service role can manage trial notifications"
ON trial_email_notifications
AS PERMISSIVE FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Fix 2: integration_logs - open insert policy allows anyone to inject logs
DROP POLICY IF EXISTS "System can insert integration logs" ON integration_logs;
CREATE POLICY "Authenticated users can insert own logs"
ON integration_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);