-- Fix orphaned widget: reassign Live Visitors Campaign Widget to active website
UPDATE public.widgets 
SET website_id = '7e7301df-9b41-46cb-bcc0-460d067e6791'
WHERE id = '7b838657-685f-4234-96cb-076aceb14570'
  AND website_id = '5c1752f0-ac33-4cfb-b5f7-b533e9632913';

-- Also fix the campaign if it points to the old website
UPDATE public.campaigns
SET website_id = '7e7301df-9b41-46cb-bcc0-460d067e6791'
WHERE website_id = '5c1752f0-ac33-4cfb-b5f7-b533e9632913'
  AND status = 'active';