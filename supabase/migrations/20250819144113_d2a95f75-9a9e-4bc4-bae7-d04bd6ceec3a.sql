-- Add converted_to_event column to social_items table for better tracking
ALTER TABLE public.social_items 
ADD COLUMN converted_to_event BOOLEAN DEFAULT false;

-- Add index for better performance when querying unconverted approved items
CREATE INDEX idx_social_items_conversion 
ON public.social_items (moderation_status, converted_to_event) 
WHERE moderation_status = 'approved' AND converted_to_event = false;