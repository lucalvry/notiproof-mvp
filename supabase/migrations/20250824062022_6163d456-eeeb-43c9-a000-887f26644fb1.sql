-- Add comprehensive cleanup functions for template/fake events
CREATE OR REPLACE FUNCTION public.cleanup_all_template_events(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete all template, demo, and manual events for user's widgets
  DELETE FROM events 
  WHERE source IN ('template', 'demo', 'manual', 'fallback')
  AND widget_id IN (
    SELECT id FROM widgets WHERE user_id = _user_id
  );
  
  -- Also clean up any events with template-like messages
  DELETE FROM events 
  WHERE widget_id IN (
    SELECT id FROM widgets WHERE user_id = _user_id
  )
  AND (
    message_template ILIKE '%people are viewing%' OR
    message_template ILIKE '%people are browsing%' OR
    message_template ILIKE '%people added this to cart%' OR
    message_template ILIKE '%someone just signed up%' OR
    message_template ILIKE '%someone just made a purchase%' OR
    message_template ILIKE '%new user joined%' OR
    message_template ILIKE '%new customer from%' OR
    message_template ILIKE '%amazing product%' OR
    message_template ILIKE '%best service ever%' OR
    message_template ILIKE '%trusted by%customers%' OR
    message_template ILIKE '%join%happy customers%'
  );
END;
$function$;

-- Add widget configuration for fallback behavior
ALTER TABLE widgets 
ADD COLUMN IF NOT EXISTS allow_fallback_content BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allowed_event_sources TEXT[] DEFAULT ARRAY['natural', 'integration', 'quick-win']::TEXT[];

-- Update existing widgets to disable fallback
UPDATE widgets SET 
  allow_fallback_content = false,
  allowed_event_sources = ARRAY['natural', 'integration', 'quick-win']::TEXT[]
WHERE allow_fallback_content IS NULL;