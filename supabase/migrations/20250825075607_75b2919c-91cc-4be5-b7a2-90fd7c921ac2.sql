-- Update natural events to have proper messages and status
UPDATE events 
SET 
  message_template = CASE 
    WHEN event_type = 'pageview' THEN 'Someone is browsing your website right now'
    WHEN event_type = 'click' THEN 'A visitor just engaged with your content'
    ELSE message_template
  END,
  status = 'approved'
WHERE source = 'manual' 
  AND message_template IS NULL 
  AND widget_id = '367accfd-e569-4e20-ab34-8395528efad6';

-- Create quick-win events for the widget
INSERT INTO events (
  widget_id,
  event_type,
  event_data,
  source,
  status,
  message_template,
  expires_at,
  views,
  clicks
)
SELECT 
  '367accfd-e569-4e20-ab34-8395528efad6',
  'offer',
  jsonb_build_object('message', template_message, 'quick_win', true),
  'quick_win',
  'approved',
  template_message,
  NOW() + INTERVAL '7 days',
  0,
  0
FROM quick_win_templates 
WHERE business_type IN ('saas', 'ecommerce') 
  AND is_active = true
LIMIT 5;