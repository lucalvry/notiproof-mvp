-- Add demo_mode_enabled field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN demo_mode_enabled boolean NOT NULL DEFAULT false;

-- Add function to clear demo events for a user
CREATE OR REPLACE FUNCTION public.clear_demo_events(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Delete all demo events for user's widgets
  DELETE FROM events 
  WHERE source = 'demo' 
  AND widget_id IN (
    SELECT id FROM widgets WHERE user_id = _user_id
  );
END;
$function$;