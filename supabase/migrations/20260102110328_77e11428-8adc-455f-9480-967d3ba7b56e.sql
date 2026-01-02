-- Fix WooCommerce templates and events: convert from HTML to simple text
-- This ensures widget.js handles all styling consistently

-- 1. Update the WooCommerce template to simple text format
UPDATE templates
SET html_template = '{{template.customer_name}} purchased {{template.product_name}}',
    updated_at = now()
WHERE provider = 'woocommerce' 
  AND template_key = 'woocommerce_purchase_v1';

-- 2. Fix existing WooCommerce events that have full HTML in message_template
-- Convert them to simple text using the stored user_name and event_data.product_name
UPDATE events 
SET message_template = CONCAT(
  COALESCE(user_name, 'Someone'),
  ' purchased ',
  COALESCE(event_data->>'product_name', 'a product')
)
WHERE event_type = 'purchase' 
  AND integration_type = 'woocommerce'
  AND (
    message_template LIKE '<div%' 
    OR message_template LIKE '%class="noti-card"%'
    OR message_template LIKE '%style=%'
  );