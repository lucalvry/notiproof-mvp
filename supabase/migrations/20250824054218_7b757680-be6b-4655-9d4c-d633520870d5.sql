-- Create function to clear manual events for a user's widgets
CREATE OR REPLACE FUNCTION public.clear_manual_events(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM events
  WHERE source = 'manual'
    AND widget_id IN (
      SELECT id FROM widgets WHERE user_id = _user_id
    );
END;
$function$;