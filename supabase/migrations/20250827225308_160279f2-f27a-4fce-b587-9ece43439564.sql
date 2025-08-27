-- Website Verification System Migration

-- Add verification fields to websites table if not exists
ALTER TABLE websites ADD COLUMN IF NOT EXISTS verification_method TEXT DEFAULT 'widget_ping';
ALTER TABLE websites ADD COLUMN IF NOT EXISTS last_verification_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0;

-- Create website_verifications table for tracking verification attempts
CREATE TABLE IF NOT EXISTS website_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL, -- 'widget_ping', 'manual', 'dns', 'file_upload'
  verification_data JSONB DEFAULT '{}',
  is_successful BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on website_verifications
ALTER TABLE website_verifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for website_verifications
CREATE POLICY "Users can view verifications for their websites" 
ON website_verifications FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM websites w 
    WHERE w.id = website_verifications.website_id 
    AND w.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert verifications for their websites" 
ON website_verifications FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM websites w 
    WHERE w.id = website_verifications.website_id 
    AND w.user_id = auth.uid()
  )
);

-- Function to verify website and update status
CREATE OR REPLACE FUNCTION verify_website(_website_id UUID, _verification_type TEXT, _verification_data JSONB DEFAULT '{}', _ip_address TEXT DEFAULT NULL, _user_agent TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  website_exists BOOLEAN := FALSE;
  verification_id UUID;
BEGIN
  -- Check if website exists and get current status
  SELECT true INTO website_exists 
  FROM websites 
  WHERE id = _website_id;
  
  IF NOT website_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Insert verification record
  INSERT INTO website_verifications (
    website_id, 
    verification_type, 
    verification_data, 
    is_successful, 
    verified_at, 
    ip_address, 
    user_agent
  ) VALUES (
    _website_id, 
    _verification_type, 
    _verification_data, 
    TRUE, 
    NOW(), 
    _ip_address, 
    _user_agent
  ) RETURNING id INTO verification_id;
  
  -- Update website verification status
  UPDATE websites 
  SET 
    is_verified = TRUE,
    last_verification_at = NOW(),
    verification_attempts = verification_attempts + 1,
    updated_at = NOW()
  WHERE id = _website_id;
  
  RETURN TRUE;
END;
$$;

-- Function to get website by domain (for verification lookup)
CREATE OR REPLACE FUNCTION get_website_by_domain(_domain TEXT)
RETURNS TABLE(id UUID, user_id UUID, name TEXT, domain TEXT, is_verified BOOLEAN)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT w.id, w.user_id, w.name, w.domain, w.is_verified
  FROM websites w
  WHERE w.domain = _domain OR w.domain = replace(_domain, 'www.', '') OR ('www.' || w.domain) = _domain
  LIMIT 1;
$$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_website_verifications_website_id ON website_verifications(website_id);
CREATE INDEX IF NOT EXISTS idx_website_verifications_verified_at ON website_verifications(verified_at);
CREATE INDEX IF NOT EXISTS idx_websites_domain ON websites(domain);
CREATE INDEX IF NOT EXISTS idx_websites_verification_status ON websites(is_verified, last_verification_at);

-- Update existing widgets to ensure they're properly linked to websites
-- This will help with data organization
UPDATE widgets 
SET website_id = (
  SELECT w.id 
  FROM websites w 
  WHERE w.user_id = widgets.user_id 
  ORDER BY w.created_at ASC 
  LIMIT 1
)
WHERE website_id IS NULL 
AND EXISTS (
  SELECT 1 FROM websites w WHERE w.user_id = widgets.user_id
);