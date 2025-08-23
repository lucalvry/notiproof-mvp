-- Enhance events table for Phase 4 Natural Proof Events
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS user_name TEXT,
ADD COLUMN IF NOT EXISTS user_email TEXT,
ADD COLUMN IF NOT EXISTS user_location TEXT,
ADD COLUMN IF NOT EXISTS message_template TEXT,
ADD COLUMN IF NOT EXISTS integration_type TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 50;

-- Create integration_types enum
DO $$ BEGIN
    CREATE TYPE integration_type AS ENUM (
        'manual', 'shopify', 'woocommerce', 'stripe', 'paystack', 'flutterwave', 
        'google_reviews', 'trustpilot', 'typeform', 'hubspot', 'wpforms', 
        'custom_sdk', 'api', 'form_hook', 'javascript_api', 'webhook'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create moderation_status enum
DO $$ BEGIN
    CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected', 'flagged');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update events table to use enums (after adding columns)
ALTER TABLE public.events 
ALTER COLUMN integration_type TYPE integration_type USING integration_type::integration_type,
ALTER COLUMN moderation_status TYPE moderation_status USING moderation_status::moderation_status;

-- Create integration_connectors table for managing external integrations
CREATE TABLE IF NOT EXISTS public.integration_connectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    integration_type integration_type NOT NULL,
    name TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    status TEXT DEFAULT 'active',
    last_sync TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for integration_connectors
ALTER TABLE public.integration_connectors ENABLE ROW LEVEL SECURITY;

-- Create policies for integration_connectors
CREATE POLICY "Users can manage their own integration connectors" 
ON public.integration_connectors 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create event_templates table for smart message templates
CREATE TABLE IF NOT EXISTS public.event_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    business_type business_type NOT NULL,
    integration_type integration_type NOT NULL,
    template TEXT NOT NULL,
    placeholders JSONB NOT NULL DEFAULT '[]',
    priority INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for event_templates
ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;

-- Create policy for event_templates (read-only for users)
CREATE POLICY "Everyone can view active event templates" 
ON public.event_templates 
FOR SELECT 
USING (is_active = true);

-- Insert default event templates
INSERT INTO public.event_templates (event_type, business_type, integration_type, template, placeholders) VALUES
('purchase', 'ecommerce', 'shopify', '{user_name} from {user_location} just bought {product_name}', '["user_name", "user_location", "product_name"]'),
('purchase', 'ecommerce', 'woocommerce', 'Someone from {user_location} purchased {product_name}', '["user_location", "product_name"]'),
('review', 'ecommerce', 'google_reviews', '{user_name} left a {rating}-star review', '["user_name", "rating"]'),
('subscription', 'saas', 'stripe', '{user_name} upgraded to {plan_name}', '["user_name", "plan_name"]'),
('signup', 'saas', 'custom_sdk', '{user_name} just signed up for a free trial', '["user_name"]'),
('form_submission', 'services', 'form_hook', '{user_name} from {user_location} requested a consultation', '["user_name", "user_location"]'),
('newsletter_signup', 'blog', 'custom_sdk', 'Someone from {user_location} subscribed to the newsletter', '["user_location"]'),
('download', 'blog', 'javascript_api', '{user_name} downloaded {asset_name}', '["user_name", "asset_name"]');

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_events_integration_type ON public.events(integration_type);
CREATE INDEX IF NOT EXISTS idx_events_moderation_status ON public.events(moderation_status);
CREATE INDEX IF NOT EXISTS idx_events_quality_score ON public.events(quality_score);
CREATE INDEX IF NOT EXISTS idx_integration_connectors_user_type ON public.integration_connectors(user_id, integration_type);