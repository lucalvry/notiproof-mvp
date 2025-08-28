-- Clean up auto-generated events that shouldn't count as notifications
-- Remove auto-generated quick-win events (they were created by migration, not user action)
DELETE FROM events 
WHERE source = 'quick_win' 
AND message_template IS NULL
AND event_type IN ('free_trial', 'feature_launch');

-- Update pageview events to have correct source (they're website tracking data, not manual notifications)
UPDATE events 
SET source = 'tracking'
WHERE event_type = 'pageview' 
AND source = 'manual';