-- Phase 2: Campaigns model with start/end dates and auto-repeat
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'ended')),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  auto_repeat BOOLEAN NOT NULL DEFAULT false,
  repeat_config JSONB DEFAULT '{}',
  display_rules JSONB NOT NULL DEFAULT jsonb_build_object(
    'show_duration_ms', 5000,
    'interval_ms', 8000,
    'max_per_page', 5,
    'max_per_session', 20,
    'url_allowlist', jsonb_build_array(),
    'url_denylist', jsonb_build_array(),
    'referrer_allowlist', jsonb_build_array(),
    'referrer_denylist', jsonb_build_array(),
    'triggers', jsonb_build_object(
      'min_time_on_page_ms', 0,
      'scroll_depth_pct', 0,
      'exit_intent', false
    ),
    'enforce_verified_only', false,
    'geo_allowlist', jsonb_build_array(),
    'geo_denylist', jsonb_build_array()
  ),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add campaign_id to widgets table to link widgets to campaigns
ALTER TABLE public.widgets 
ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- Phase 3: Enhanced analytics with heatmap data
CREATE TABLE public.heatmap_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  widget_id UUID NOT NULL REFERENCES public.widgets(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  click_x INTEGER NOT NULL,
  click_y INTEGER NOT NULL,
  viewport_width INTEGER,
  viewport_height INTEGER,
  element_selector TEXT,
  element_text TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- A/B testing variants table
CREATE TABLE public.widget_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  widget_id UUID NOT NULL REFERENCES public.widgets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  split_percentage INTEGER NOT NULL DEFAULT 50 CHECK (split_percentage >= 0 AND split_percentage <= 100),
  is_control BOOLEAN NOT NULL DEFAULT false,
  style_config JSONB DEFAULT '{}',
  content_config JSONB DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add variant tracking to events table
ALTER TABLE public.events 
ADD COLUMN variant_id UUID REFERENCES public.widget_variants(id) ON DELETE SET NULL;

-- Enable RLS for new tables
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heatmap_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_variants ENABLE ROW LEVEL SECURITY;

-- RLS policies for campaigns
CREATE POLICY "Users can view their own campaigns" ON public.campaigns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" ON public.campaigns
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" ON public.campaigns
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all campaigns" ON public.campaigns
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for heatmap_clicks
CREATE POLICY "Users can view heatmap data for their widgets" ON public.heatmap_clicks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM widgets w 
      WHERE w.id = heatmap_clicks.widget_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can insert heatmap data for active widgets" ON public.heatmap_clicks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM widgets w 
      WHERE w.id = heatmap_clicks.widget_id AND w.status = 'active'
    )
  );

CREATE POLICY "Admins can view all heatmap data" ON public.heatmap_clicks
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for widget_variants
CREATE POLICY "Users can view variants for their widgets" ON public.widget_variants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM widgets w 
      WHERE w.id = widget_variants.widget_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage variants for their widgets" ON public.widget_variants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM widgets w 
      WHERE w.id = widget_variants.widget_id AND w.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM widgets w 
      WHERE w.id = widget_variants.widget_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all variants" ON public.widget_variants
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes for better performance
CREATE INDEX idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_dates ON public.campaigns(start_date, end_date);
CREATE INDEX idx_heatmap_clicks_widget_id ON public.heatmap_clicks(widget_id);
CREATE INDEX idx_heatmap_clicks_page_url ON public.heatmap_clicks(page_url);
CREATE INDEX idx_widget_variants_widget_id ON public.widget_variants(widget_id);

-- Update trigger for campaigns
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for widget_variants
CREATE TRIGGER update_widget_variants_updated_at
  BEFORE UPDATE ON public.widget_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();