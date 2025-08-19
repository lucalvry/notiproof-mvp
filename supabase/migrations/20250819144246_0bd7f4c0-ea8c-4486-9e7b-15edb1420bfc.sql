-- Expand business_type enum to cover all major industries
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'retail';
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'hospitality';
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'healthcare';
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'real_estate';
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'automotive';
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'fitness';
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'beauty';
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'food_beverage';
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'travel';
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'finance';
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'technology';
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'consulting';
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'manufacturing';
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'media';
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'legal';

-- Add context_template field to events table for flexible message formatting
ALTER TABLE public.events 
ADD COLUMN context_template TEXT;

-- Add business_context field to store dynamic context data
ALTER TABLE public.events 
ADD COLUMN business_context JSONB DEFAULT '{}'::jsonb;

-- Add index for better performance when querying by business type
CREATE INDEX IF NOT EXISTS idx_events_business_type 
ON public.events (business_type) 
WHERE business_type IS NOT NULL;