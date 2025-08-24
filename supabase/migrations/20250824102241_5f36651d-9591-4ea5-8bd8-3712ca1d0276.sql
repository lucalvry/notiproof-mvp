-- Clear all manual and demo events completely
DELETE FROM events 
WHERE source IN ('manual', 'demo', 'template', 'fallback');

-- Update widgets to only allow natural and integration events
UPDATE widgets 
SET allowed_event_sources = ARRAY['natural', 'integration', 'woocommerce', 'shopify', 'ecommerce']
WHERE allowed_event_sources @> ARRAY['manual'] OR allowed_event_sources @> ARRAY['demo'];