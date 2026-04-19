
-- ============================================================
-- 1) email_send_log: lock down writes, allow self-read
-- ============================================================

-- Block any INSERT/UPDATE/DELETE from non-service callers.
-- (Service role bypasses RLS, so the queue dispatcher still works.)
DROP POLICY IF EXISTS "No client inserts on email_send_log" ON public.email_send_log;
CREATE POLICY "No client inserts on email_send_log"
  ON public.email_send_log
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (false);

DROP POLICY IF EXISTS "No client updates on email_send_log" ON public.email_send_log;
CREATE POLICY "No client updates on email_send_log"
  ON public.email_send_log
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "No client deletes on email_send_log" ON public.email_send_log;
CREATE POLICY "No client deletes on email_send_log"
  ON public.email_send_log
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated, anon
  USING (false);

-- Allow authenticated users to see only logs addressed to their own email.
DROP POLICY IF EXISTS "Users can view their own email logs" ON public.email_send_log;
CREATE POLICY "Users can view their own email logs"
  ON public.email_send_log
  FOR SELECT
  TO authenticated
  USING (
    recipient_email = (
      SELECT u.email FROM auth.users u WHERE u.id = auth.uid()
    )
  );

-- ============================================================
-- 2) user_roles: prevent privilege escalation to superadmin
-- ============================================================

-- Only a superadmin may insert a 'superadmin' role row.
DROP POLICY IF EXISTS "Only superadmins can grant superadmin role" ON public.user_roles;
CREATE POLICY "Only superadmins can grant superadmin role"
  ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    role::text <> 'superadmin' OR public.is_superadmin(auth.uid())
  );

-- Only a superadmin may update a row to become 'superadmin'.
DROP POLICY IF EXISTS "Only superadmins can elevate to superadmin" ON public.user_roles;
CREATE POLICY "Only superadmins can elevate to superadmin"
  ON public.user_roles
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    role::text <> 'superadmin' OR public.is_superadmin(auth.uid())
  );

-- Restrict the broad permissive INSERT policy to authenticated users only
-- (it currently applies to public, including anon).
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
CREATE POLICY "Admins can insert user roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
  );
