-- Update existing events from WooCommerce to have proper business context
UPDATE events 
SET 
  business_type = 'ecommerce',
  user_name = CASE 
    WHEN event_data->>'customer_name' IS NOT NULL THEN event_data->>'customer_name'
    ELSE NULL
  END,
  user_location = CASE 
    WHEN event_data->>'location' IS NOT NULL THEN event_data->>'location'
    ELSE NULL
  END,
  message_template = CASE 
    WHEN event_data->>'customer_name' IS NOT NULL AND event_data->>'location' IS NOT NULL AND event_data->>'product_name' IS NOT NULL
    THEN CONCAT(event_data->>'customer_name', ' from ', event_data->>'location', ' just bought ', event_data->>'product_name')
    ELSE 'Someone just made a purchase'
  END,
  business_context = jsonb_build_object(
    'industry', 'ecommerce',
    'platform', 'woocommerce',
    'customer_type', 'customer'
  ),
  context_template = 'ecommerce_purchase'
WHERE 
  source = 'woocommerce' 
  AND business_type IS NULL
  AND event_type = 'purchase';

-- Update existing widgets to have business context based on their usage
UPDATE widgets 
SET 
  display_rules = display_rules || jsonb_build_object(
    'business_context', jsonb_build_object(
      'industry', 'ecommerce',
      'platform', 'web',
      'customer_type', 'mixed'
    )
  )
WHERE 
  id IN (
    SELECT DISTINCT widget_id 
    FROM events 
    WHERE source = 'woocommerce' OR event_type = 'purchase'
  )
  AND (display_rules->>'business_context') IS NULL;