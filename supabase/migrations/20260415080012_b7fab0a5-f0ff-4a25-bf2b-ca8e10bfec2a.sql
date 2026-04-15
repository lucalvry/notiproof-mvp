-- Fix live_visitors templates: remap flat preview_json keys to template-prefixed keys

-- Checkout Urgency: count→template.visitor_count, page_name→template.page_name, page_url→template.page_url, location→template.location
UPDATE templates SET preview_json = '{"template.visitor_count": 6, "template.page_name": "Checkout", "template.page_url": "/checkout", "template.location": ""}'::jsonb
WHERE id = '83f35082-6ed4-42cc-8181-c96e0d3c2125';

-- Compact Badge: count→template.visitor_count, keep icon and message at top level (used as {{icon}} {{message}})
UPDATE templates SET preview_json = '{"template.visitor_count": 12, "icon": "👀", "message": "viewing now"}'::jsonb
WHERE id = '1849fc79-2a0e-4aff-839b-8afdfa0003c1';

-- Live Counter: count→template.visitor_count, location→template.location, keep message
UPDATE templates SET preview_json = '{"template.visitor_count": 18, "template.location": "Multiple countries", "message": "people online now", "location": true}'::jsonb
WHERE id = 'df94731b-f71f-4832-841d-ac712f5c18de';

-- Location Rich: count→template.visitor_count, keep message and location_list at top level
UPDATE templates SET preview_json = '{"template.visitor_count": 34, "message": "visitors worldwide", "location_list": "USA, UK, Canada, Germany"}'::jsonb
WHERE id = '3dc8cad7-2fa4-4494-b223-1d4fd6eb5de7';

-- Page Viewer with Link: count→template.visitor_count, page_name→template.page_name, page_url→template.page_url, location→template.location
UPDATE templates SET preview_json = '{"template.visitor_count": 23, "template.page_name": "Products", "template.page_url": "/shop/products", "template.location": "United States", "location": true}'::jsonb
WHERE id = '1d14da98-6f25-49fa-a233-19b02ab308cb';

-- Popular Page Alert: count→template.visitor_count, page_name→template.page_name, page_url→template.page_url, location→template.location
UPDATE templates SET preview_json = '{"template.visitor_count": 42, "template.page_name": "Best Sellers", "template.page_url": "/best-sellers", "template.location": "Worldwide", "location": true}'::jsonb
WHERE id = 'f0ae45ad-baa9-45da-9aeb-e77b696dc896';

-- Product Interest Alert: count→template.visitor_count, page_name→template.page_name, page_url→template.page_url, location→template.location
UPDATE templates SET preview_json = '{"template.visitor_count": 8, "template.page_name": "Summer Collection", "template.page_url": "/collections/summer", "template.location": "California", "location": true}'::jsonb
WHERE id = '377495ce-5ec4-4bd6-929c-377d1fbe9d7a';

-- Shop Activity Pulse: count→template.visitor_count, page_name→template.page_name, page_url→template.page_url, location→template.location
UPDATE templates SET preview_json = '{"template.visitor_count": 15, "template.page_name": "Shop", "template.page_url": "/shop", "template.location": "New York", "location": true}'::jsonb
WHERE id = '4b39594f-9290-49f0-8632-e40d58bac469';

-- Social Proof Card: count→template.visitor_count, keep icon and message at top level
UPDATE templates SET preview_json = '{"template.visitor_count": 23, "icon": "👥", "template.location": "United States", "message": "people are viewing this page"}'::jsonb
WHERE id = '40b9386f-2596-4822-9940-8a88e66b3e2b';

-- Urgency Banner: count→template.visitor_count, keep message and prefix at top level
UPDATE templates SET preview_json = '{"template.visitor_count": 45, "message": "people viewing right now!", "prefix": "HOT -"}'::jsonb
WHERE id = '405e1ea3-aaec-4ab6-a6ac-0a11d3244dc3';