-- Clean up event sources to only have natural, quick_win, and integrations
-- First, update the event_source enum to only include the approved sources
DROP TYPE IF EXISTS event_source CASCADE;
CREATE TYPE event_source AS ENUM ('natural', 'quick_win', 'integrations');

-- Delete all manual and pageview events
DELETE FROM events WHERE source = 'manual' OR event_type = 'pageview';

-- Update any remaining events with invalid sources to 'natural'
UPDATE events SET source = 'natural' WHERE source NOT IN ('natural', 'quick_win', 'integrations');

-- Recreate the events table constraints
ALTER TABLE events ALTER COLUMN source TYPE event_source USING source::event_source;