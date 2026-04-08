-- Drop unused indexes (zero scans, wasting space)
DROP INDEX IF EXISTS idx_profiles_onboarding_progress;
DROP INDEX IF EXISTS idx_campaigns_integration_settings;
DROP INDEX IF EXISTS idx_campaigns_native_config;
DROP INDEX IF EXISTS idx_campaigns_data_sources;

-- Add missing performance indexes
CREATE INDEX IF NOT EXISTS idx_widgets_user_id ON public.widgets(user_id);
CREATE INDEX IF NOT EXISTS idx_widgets_user_status ON public.widgets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_websites_user_id ON public.websites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);