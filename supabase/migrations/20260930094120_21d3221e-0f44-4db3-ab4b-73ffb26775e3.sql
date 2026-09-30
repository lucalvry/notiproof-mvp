DROP POLICY IF EXISTS ag_anon_branding_select ON public.agencies;
REVOKE SELECT ON public.agencies FROM anon;