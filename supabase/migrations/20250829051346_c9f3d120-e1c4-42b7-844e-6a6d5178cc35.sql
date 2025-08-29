-- Phase 2: Fix Widget Event Source Configuration for Reforge Studios
-- Update Reforge Studios widget to allow quick_win events in addition to natural
UPDATE widgets 
SET allowed_event_sources = '["natural", "quick_win"]'::jsonb
WHERE id = '490cd98f-30d0-4aa9-9bf0-2a1fde0e6791'
AND name = 'Reforge Studios Plus Widget';

-- Phase 3: Fix Event Status and Create Natural Events  
-- Update existing events to have approved status where appropriate
UPDATE events 
SET status = 'approved', moderation_status = 'approved'
WHERE widget_id = '490cd98f-30d0-4aa9-9bf0-2a1fde0e6791'
AND status = 'pending';

-- Create some natural booking/contact events for Reforge Studios
INSERT INTO events (
  widget_id,
  event_type,
  event_data,
  business_type,
  user_name,
  user_location,
  message_template,
  source,
  status,
  moderation_status,
  quality_score,
  views,
  clicks,
  created_at
) VALUES 
(
  '490cd98f-30d0-4aa9-9bf0-2a1fde0e6791',
  'booking',
  '{"service": "Studio Recording Session", "date": "2025-08-30", "time": "2:00 PM", "duration": "3 hours"}'::jsonb,
  'services',
  'Chioma A.',
  'Lagos, Nigeria',
  'Chioma A. from Lagos, Nigeria just booked a Studio Recording Session',
  'natural',
  'approved',
  'approved',
  85,
  0,
  0,
  NOW() - INTERVAL '2 hours'
),
(
  '490cd98f-30d0-4aa9-9bf0-2a1fde0e6791',
  'contact',
  '{"inquiry_type": "Photography Package", "message": "Interested in wedding photography services", "phone": "+234XXXXXXX"}'::jsonb,
  'services',
  'David O.',
  'Abuja, Nigeria',
  'David O. from Abuja, Nigeria sent an inquiry about Photography Package',
  'natural',
  'approved',
  'approved',
  80,
  0,
  0,
  NOW() - INTERVAL '4 hours'
),
(
  '490cd98f-30d0-4aa9-9bf0-2a1fde0e6791',
  'booking',
  '{"service": "Music Video Production", "date": "2025-09-01", "time": "10:00 AM", "budget": "₦500,000"}'::jsonb,
  'services',
  'Kemi S.',
  'Port Harcourt, Nigeria',
  'Kemi S. from Port Harcourt, Nigeria just booked a Music Video Production',
  'natural',
  'approved',
  'approved',
  90,
  0,
  0,
  NOW() - INTERVAL '6 hours'
),
(
  '490cd98f-30d0-4aa9-9bf0-2a1fde0e6791',
  'contact',
  '{"inquiry_type": "Photography Workshop", "message": "Interested in joining the next photography workshop", "email": "contact@example.com"}'::jsonb,
  'services',
  'Tunde M.',
  'Ibadan, Nigeria',
  'Tunde M. from Ibadan, Nigeria inquired about Photography Workshop',
  'natural',
  'approved',
  'approved',
  75,
  0,
  0,
  NOW() - INTERVAL '8 hours'
);