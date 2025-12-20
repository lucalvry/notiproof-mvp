-- Insert LTD subscription plan with correct values
INSERT INTO subscription_plans (
  name, 
  price_monthly, 
  price_yearly,
  max_websites, 
  max_events_per_month,
  storage_limit_bytes,
  video_max_duration_seconds,
  testimonial_limit,
  form_limit,
  is_active,
  can_remove_branding,
  custom_domain_enabled,
  analytics_level,
  has_white_label,
  has_api
) VALUES (
  'LTD',
  0,                        -- No monthly cost
  79,                       -- One-time price (stored in yearly for reference)
  3,                        -- 3 websites
  25000,                    -- 25K events/month
  5368709120,               -- 5GB storage
  180,                      -- 3 min video max (matches Starter)
  NULL,                     -- Unlimited testimonials
  NULL,                     -- Unlimited forms
  false,                    -- NOT visible in pricing page
  true,                     -- Can remove branding
  true,                     -- Custom domain enabled (matches Starter+)
  'advanced',               -- Advanced analytics
  false,                    -- No white label
  true                      -- API access included
);