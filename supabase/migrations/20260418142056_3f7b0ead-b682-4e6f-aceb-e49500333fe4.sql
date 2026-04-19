
-- Replace the previous USING(true) UPDATE policy with one that scopes
-- updates to admins/superadmins only, and continues to block elevation
-- to 'superadmin' unless the caller is already a superadmin.
DROP POLICY IF EXISTS "Only superadmins can elevate to superadmin" ON public.user_roles;

CREATE POLICY "Only superadmins can elevate to superadmin"
  ON public.user_roles
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
  )
  WITH CHECK (
    role::text <> 'superadmin' OR public.is_superadmin(auth.uid())
  );
