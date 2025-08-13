-- Fix security issues: set search_path for functions
CREATE OR REPLACE FUNCTION update_template_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.marketplace_templates 
  SET 
    rating_average = (
      SELECT AVG(rating)::DECIMAL(3,2) 
      FROM public.template_ratings 
      WHERE template_id = NEW.template_id
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM public.template_ratings 
      WHERE template_id = NEW.template_id
    )
  WHERE id = NEW.template_id;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION increment_download_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.marketplace_templates 
  SET download_count = download_count + 1
  WHERE id = NEW.template_id;
  
  RETURN NEW;
END;
$$;