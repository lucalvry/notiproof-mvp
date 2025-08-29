-- Clean up event sources to only have natural, quick_win, and integrations
-- First check current enum values
-- DROP TYPE IF EXISTS event_source CASCADE;
-- CREATE TYPE event_source AS ENUM ('natural', 'quick_win', 'integrations');

-- Delete all manual and pageview events  
DELETE FROM events WHERE source = 'manual'::event_source OR event_type = 'pageview';

-- Delete any tracking events too since they're not in the approved list
DELETE FROM events WHERE event_type = 'tracking';

-- Update widgets to remove manual from allowed_event_sources
UPDATE widgets 
SET display_rules = jsonb_set(
  COALESCE(display_rules, '{}'::jsonb),
  '{allowed_event_sources}',
  '["natural", "quick_win", "integrations"]'::jsonb
)
WHERE display_rules->'allowed_event_sources' ? 'manual';

-- Add more natural events to replace the deleted manual ones for Reforge Studios
INSERT INTO events (
  widget_id,
  event_type,
  event_data,
  source,
  status,
  moderation_status,
  business_type,
  user_name,
  user_location,
  message_template,
  created_at
) VALUES 
(
  '490cd98f-30d0-4aa9-9bf0-2a1fde0e6791',
  'booking',
  '{"message": "Amara from Lagos booked a creative session", "service": "creative session"}'::jsonb,
  'natural',
  'approved',
  'approved',
  'services',
  'Amara',
  'Lagos, Nigeria',
  'Amara from Lagos booked a creative session',
  NOW() - INTERVAL '20 minutes'
),
(
  '490cd98f-30d0-4aa9-9bf0-2a1fde0e6791',
  'contact',
  '{"message": "Someone from Kano inquired about studio services", "service": "studio services"}'::jsonb,
  'natural',
  'approved',
  'approved',
  'services',
  NULL,
  'Kano, Nigeria',
  'Someone from Kano inquired about studio services',
  NOW() - INTERVAL '3 hours'
);