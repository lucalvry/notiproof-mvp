-- Fix existing pending WooCommerce events by approving them
UPDATE events 
SET status = 'approved', 
    moderation_status = 'approved'
WHERE event_type = 'purchase' 
  AND source = 'woocommerce' 
  AND (status = 'pending' OR moderation_status = 'pending');