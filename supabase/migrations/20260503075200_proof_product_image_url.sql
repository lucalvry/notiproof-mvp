-- Add product image + URL columns so purchase-driven proofs can fall back to a
-- product visual + click-through CTA when no testimonial media is supplied.
ALTER TABLE public.proof_objects
  ADD COLUMN IF NOT EXISTS product_image_url text,
  ADD COLUMN IF NOT EXISTS product_url text;

-- Backfill: for the specific testimonial reported by the user, promote the
-- previously submitted customer photo from author_photo_url to media_url so
-- it actually appears in the testimonial.
UPDATE public.proof_objects
SET media_url = COALESCE(media_url, author_photo_url),
    media_type = COALESCE(media_type, 'image')
WHERE id = '2abcf886-2f6d-4bb3-b3ee-673268706b1e'
  AND media_url IS NULL
  AND author_photo_url IS NOT NULL;
