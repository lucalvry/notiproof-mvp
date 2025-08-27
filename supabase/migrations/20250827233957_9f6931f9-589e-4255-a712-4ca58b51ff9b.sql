-- Add default value for verification_token column to automatically generate tokens
ALTER TABLE public.websites 
ALTER COLUMN verification_token SET DEFAULT gen_random_uuid()::text;

-- Update existing websites that don't have verification tokens
UPDATE public.websites 
SET verification_token = gen_random_uuid()::text 
WHERE verification_token IS NULL;