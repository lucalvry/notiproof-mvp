-- Fix Phase 3: Remove embedded footer from existing WooCommerce purchase events
-- This removes the duplicate location/time footer that was hardcoded in templates
-- The widget.js handles this metadata display properly

UPDATE events 
SET message_template = REGEXP_REPLACE(
  message_template, 
  '<div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">[^<]*</div>\s*', 
  '', 
  'g'
)
WHERE event_type = 'purchase' 
  AND message_template LIKE '%font-size: 11px; color: #9ca3af%';

-- Also update the database template for WooCommerce to remove the footer
UPDATE templates
SET html_template = REGEXP_REPLACE(
  html_template,
  '<div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">{{template.customer_location}} • {{template.time_ago}}</div>\s*',
  '',
  'g'
),
updated_at = now()
WHERE provider = 'woocommerce' 
  AND template_key = 'woocommerce_purchase_v1';