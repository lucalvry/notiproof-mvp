-- Add integration column to widgets
ALTER TABLE public.widgets
ADD COLUMN IF NOT EXISTS integration TEXT NOT NULL DEFAULT 'manual';

-- Create integration_hooks table
CREATE TABLE IF NOT EXISTS public.integration_hooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- e.g., 'zapier', 'pabbly', 'webhook'
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_hooks ENABLE ROW LEVEL SECURITY;

-- Policies for integration_hooks
CREATE POLICY IF NOT EXISTS "Users can view their own integration hooks"
ON public.integration_hooks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own integration hooks"
ON public.integration_hooks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own integration hooks"
ON public.integration_hooks
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own integration hooks"
ON public.integration_hooks
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Admins can view all integration hooks"
ON public.integration_hooks
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY IF NOT EXISTS "Support can view all integration hooks"
ON public.integration_hooks
FOR SELECT
USING (has_role(auth.uid(), 'support'));

-- Create alerts table for system notifications
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  widget_id UUID,
  type TEXT NOT NULL, -- e.g., 'widget_api_error', 'widget_inactive_request'
  message TEXT,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies: admins/support see all, users see their own
CREATE POLICY IF NOT EXISTS "Admins can view all alerts"
ON public.alerts
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY IF NOT EXISTS "Support can view all alerts"
ON public.alerts
FOR SELECT
USING (has_role(auth.uid(), 'support'));

CREATE POLICY IF NOT EXISTS "Users can view their own alerts"
ON public.alerts
FOR SELECT
USING (user_id = auth.uid());

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_widgets_integration ON public.widgets(integration);
CREATE INDEX IF NOT EXISTS idx_integration_hooks_user ON public.integration_hooks(user_id);
