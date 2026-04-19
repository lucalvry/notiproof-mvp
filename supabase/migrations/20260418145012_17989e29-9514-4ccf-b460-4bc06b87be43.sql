-- Add fallback_url column to media table for Bunny CDN failure resilience
ALTER TABLE public.media
ADD COLUMN IF NOT EXISTS fallback_url text;

COMMENT ON COLUMN public.media.fallback_url IS 'Supabase Storage public URL used as fallback when Bunny CDN fails to serve the file';

-- Ensure the public testimonials storage bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('testimonials', 'testimonials', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read access to testimonial fallback files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Testimonials bucket is publicly readable'
  ) THEN
    CREATE POLICY "Testimonials bucket is publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'testimonials');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Service role can write testimonial fallbacks'
  ) THEN
    CREATE POLICY "Service role can write testimonial fallbacks"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'testimonials');
  END IF;
END $$;