-- Update existing demo events to have realistic view and click counts
UPDATE events 
SET 
  views = 1,
  clicks = CASE 
    WHEN id IN (
      SELECT id FROM events 
      WHERE widget_id = '8532eb3f-9e2c-4139-bc35-f6300f332e33' 
      AND source = 'demo' 
      ORDER BY created_at DESC 
      LIMIT 2
    ) THEN 1 
    ELSE 0 
  END
WHERE widget_id = '8532eb3f-9e2c-4139-bc35-f6300f332e33' 
  AND source = 'demo' 
  AND views = 0;