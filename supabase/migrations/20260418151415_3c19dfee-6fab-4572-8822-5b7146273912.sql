-- Phase 1: Add CTA fields to testimonials for conversion attribution
ALTER TABLE public.testimonials
  ADD COLUMN IF NOT EXISTS cta_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cta_text text,
  ADD COLUMN IF NOT EXISTS cta_url text;

-- Phase 3: Allow impact_goals to use testimonial_cta_click as an interaction_type.
-- interaction_type is currently a free-text column, so no enum change is required.
-- We add a comment for documentation.
COMMENT ON COLUMN public.impact_goals.interaction_type IS
  'Type of tracked interaction: notification_click, form_submit, page_visit, testimonial_cta_click, etc.';

-- Index to speed up impact attribution lookups by testimonial CTA destination
CREATE INDEX IF NOT EXISTS idx_testimonials_cta_enabled ON public.testimonials(cta_enabled) WHERE cta_enabled = true;