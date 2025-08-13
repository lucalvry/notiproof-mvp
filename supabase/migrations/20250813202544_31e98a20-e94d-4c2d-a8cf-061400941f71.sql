-- Create function to count integrations by type
CREATE OR REPLACE FUNCTION public.get_integration_count(_user_id uuid, _types text[] DEFAULT '{}')
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT CASE 
    WHEN array_length(_types, 1) IS NULL OR array_length(_types, 1) = 0 THEN
      COUNT(*)::integer
    ELSE 
      COUNT(*)::integer
    END
  FROM public.integration_hooks ih
  WHERE ih.user_id = _user_id 
    AND (array_length(_types, 1) IS NULL OR array_length(_types, 1) = 0 OR ih.type = ANY(_types));
$function$;