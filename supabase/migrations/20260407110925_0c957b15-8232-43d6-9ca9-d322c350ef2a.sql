
-- Update Free plan: activate it and set correct limits
UPDATE subscription_plans 
SET is_active = true, 
    max_websites = 1, 
    max_events_per_month = 5000, 
    storage_limit_bytes = 104857600, -- 100MB
    video_max_duration_seconds = 30,
    price_monthly = 0,
    price_yearly = 0,
    can_remove_branding = false,
    custom_domain_enabled = false,
    has_api = false,
    has_white_label = false,
    updated_at = now()
WHERE name = 'Free';

-- Update Starter plan: new pricing and limits
UPDATE subscription_plans 
SET price_monthly = 5, 
    price_yearly = 50,
    max_websites = 3, 
    max_events_per_month = 30000, 
    storage_limit_bytes = 314572800, -- 300MB
    video_max_duration_seconds = 180,
    can_remove_branding = true,
    custom_domain_enabled = false,
    has_api = false,
    has_white_label = false,
    stripe_price_id_monthly = 'price_1TJHduA2FPTkZA9SfudtTie7',
    stripe_price_id_yearly = 'price_1TJHfiA2FPTkZA9SCaMu7D2d',
    updated_at = now()
WHERE name = 'Starter';

-- Update Standard plan: new pricing and limits
UPDATE subscription_plans 
SET price_monthly = 15, 
    price_yearly = 150,
    max_websites = 999, -- unlimited
    max_events_per_month = 100000, 
    storage_limit_bytes = 524288000, -- 500MB
    video_max_duration_seconds = 300,
    can_remove_branding = true,
    custom_domain_enabled = true,
    has_api = true,
    has_white_label = false,
    stripe_price_id_monthly = 'price_1TJHipA2FPTkZA9SlGWZS1Fx',
    stripe_price_id_yearly = 'price_1TJHjqA2FPTkZA9S4JNpy9vP',
    updated_at = now()
WHERE name = 'Standard';

-- Update Pro plan: rename to Professional with new pricing
UPDATE subscription_plans 
SET name = 'Professional',
    price_monthly = 40, 
    price_yearly = 400,
    max_websites = 999, -- unlimited
    max_events_per_month = 400000, 
    storage_limit_bytes = 1073741824, -- 1GB
    video_max_duration_seconds = 600,
    can_remove_branding = true,
    custom_domain_enabled = true,
    has_api = true,
    has_white_label = true,
    stripe_price_id_monthly = 'price_1TJID4A2FPTkZA9SoLF5CHVD',
    stripe_price_id_yearly = 'price_1TJIEfA2FPTkZA9STTSrkoMc',
    updated_at = now()
WHERE name = 'Pro';

-- Deactivate Business plan (no longer in pricing)
UPDATE subscription_plans 
SET is_active = false, updated_at = now()
WHERE name = 'Business';
