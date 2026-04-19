
-- ============================================================
-- 1) Add ownership checks to destructive media functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.purge_deleted_media(_media_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
  is_service_role BOOLEAN;
BEGIN
  -- Allow service_role (used by scheduled cleanup edge function) to purge any record.
  is_service_role := COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role', '') = 'service_role';

  IF is_service_role THEN
    DELETE FROM media WHERE id = ANY(_media_ids);
  ELSE
    -- Authenticated callers may only purge their own media.
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    DELETE FROM media
    WHERE id = ANY(_media_ids)
      AND user_id = auth.uid();
  END IF;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_website_media_for_deletion(_website_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  count1 INTEGER;
  count2 INTEGER;
  is_service_role BOOLEAN;
BEGIN
  is_service_role := COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role', '') = 'service_role';

  -- Ownership check (skip for service role)
  IF NOT is_service_role THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM websites WHERE id = _website_id AND user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Access denied: you do not own this website';
    END IF;
  END IF;

  UPDATE media
  SET deleted_at = NOW()
  WHERE website_id = _website_id
    AND deleted_at IS NULL;
  GET DIAGNOSTICS count1 = ROW_COUNT;

  UPDATE media m
  SET deleted_at = NOW()
  FROM testimonials t
  WHERE m.testimonial_id = t.id
    AND t.website_id = _website_id
    AND m.deleted_at IS NULL;
  GET DIAGNOSTICS count2 = ROW_COUNT;

  RETURN count1 + count2;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_website_media(_website_id uuid)
 RETURNS TABLE(id uuid, cdn_url text, file_size bigint, type text, testimonial_id uuid, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_service_role BOOLEAN;
BEGIN
  is_service_role := COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role', '') = 'service_role';

  IF NOT is_service_role THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM websites w
      WHERE w.id = _website_id
        AND (w.user_id = auth.uid() OR public.is_admin(auth.uid()))
    ) THEN
      RAISE EXCEPTION 'Access denied: you do not own this website';
    END IF;
  END IF;

  RETURN QUERY
  SELECT m.id, m.cdn_url, m.file_size, m.type, m.testimonial_id, m.created_at
  FROM media m
  WHERE m.website_id = _website_id
    AND m.deleted_at IS NULL
  UNION
  SELECT m.id, m.cdn_url, m.file_size, m.type, m.testimonial_id, m.created_at
  FROM media m
  JOIN testimonials t ON m.testimonial_id = t.id
  WHERE t.website_id = _website_id
    AND m.deleted_at IS NULL;
END;
$function$;

-- ============================================================
-- 2) Prevent anonymous email enumeration
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.check_email_exists(text) FROM anon, public;
-- Keep authenticated access (used inside the app for duplicate-account checks).
GRANT EXECUTE ON FUNCTION public.check_email_exists(text) TO authenticated;
