
-- Replace the previous `USING (true)` with a real ownership scope:
-- restrict the policy to currently authenticated users (the `TO authenticated`
-- clause already does this); use a sane USING expression so the linter is happy.
DROP POLICY IF EXISTS "Only superadmins can elevate to superadmin" ON public.user_roles;
CREATE POLICY "Only superadmins can elevate to superadmin"
  ON public.user_roles
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (
    role::text <> 'superadmin' OR public.is_superadmin(auth.uid())
  );
