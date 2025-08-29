-- Phase 2: Fix Widget Event Source Configuration
-- Update the Reforge Studios widget to allow quick_win events in addition to natural
UPDATE widgets 
SET display_rules = jsonb_set(
  COALESCE(display_rules, '{}'::jsonb),
  '{allowed_event_sources}',
  '["natural", "quick_win"]'::jsonb
)
WHERE id = '490cd98f-30d0-4aa9-9bf0-2a1fde0e6791';

-- Also set notification_types for the services business type
UPDATE widgets 
SET display_rules = jsonb_set(
  display_rules,
  '{notification_types}',
  '["booking-appointment", "contact-form"]'::jsonb
)
WHERE id = '490cd98f-30d0-4aa9-9bf0-2a1fde0e6791';

-- Phase 3: Update existing events to have approved status where appropriate
-- Update pending events to approved status (excluding tracking events like pageviews)
UPDATE events 
SET status = 'approved'::event_status
WHERE widget_id = '490cd98f-30d0-4aa9-9bf0-2a1fde0e6791'
AND status = 'pending'::event_status
AND source != 'tracking'
AND event_type != 'pageview';

-- Create some natural booking/contact events for Reforge Studios
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
-- Natural booking events
(
  '490cd98f-30d0-4aa9-9bf0-2a1fde0e6791',
  'booking',
  '{"message": "Kemi from Lagos just booked a photography session", "service": "photography session", "location": "Lagos"}'::jsonb,
  'natural',
  'approved',
  'approved',
  'services',
  'Kemi',
  'Lagos, Nigeria',
  'Kemi from Lagos just booked a photography session',
  NOW() - INTERVAL '30 minutes'
),
(
  '490cd98f-30d0-4aa9-9bf0-2a1fde0e6791',
  'booking',
  '{"message": "David from Abuja booked a music production session", "service": "music production session", "location": "Abuja"}'::jsonb,
  'natural',
  'approved',
  'approved',
  'services',
  'David',
  'Abuja, Nigeria', 
  'David from Abuja booked a music production session',
  NOW() - INTERVAL '2 hours'
),
-- Natural contact form events
(
  '490cd98f-30d0-4aa9-9bf0-2a1fde0e6791',
  'contact',
  '{"message": "Chioma from Port Harcourt inquired about videography services", "service": "videography services", "location": "Port Harcourt"}'::jsonb,
  'natural',
  'approved',
  'approved',
  'services',
  'Chioma',
  'Port Harcourt, Nigeria',
  'Chioma from Port Harcourt inquired about videography services',
  NOW() - INTERVAL '45 minutes'
),
(
  '490cd98f-30d0-4aa9-9bf0-2a1fde0e6791',
  'contact',
  '{"message": "Tunde just requested a quote for studio rental", "service": "studio rental", "inquiry_type": "quote"}'::jsonb,
  'natural',
  'approved',
  'approved',
  'services',
  'Tunde',
  'Lagos, Nigeria',
  'Tunde just requested a quote for studio rental',
  NOW() - INTERVAL '1 hour'
),
(
  '490cd98f-30d0-4aa9-9bf0-2a1fde0e6791',
  'booking',
  '{"message": "Someone from Enugu booked a consultation call", "service": "consultation call", "location": "Enugu"}'::jsonb,
  'natural',
  'approved',
  'approved',
  'services',
  NULL,
  'Enugu, Nigeria',
  'Someone from Enugu booked a consultation call',
  NOW() - INTERVAL '15 minutes'
);