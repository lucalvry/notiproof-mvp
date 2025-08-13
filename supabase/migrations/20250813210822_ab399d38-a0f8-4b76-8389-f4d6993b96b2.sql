-- Create template marketplace tables
CREATE TABLE public.marketplace_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  template_config JSONB NOT NULL DEFAULT '{}',
  style_config JSONB NOT NULL DEFAULT '{}',
  display_rules JSONB NOT NULL DEFAULT '{}',
  preview_image TEXT,
  download_count INTEGER NOT NULL DEFAULT 0,
  rating_average DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT true,
  price_cents INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create template ratings table
CREATE TABLE public.template_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(template_id, user_id)
);

-- Create template downloads tracking
CREATE TABLE public.template_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES marketplace_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analytics insights table for AI suggestions
CREATE TABLE public.analytics_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  widget_id UUID REFERENCES widgets(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- 'suggestion', 'trend', 'opportunity'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0,
  data_points JSONB NOT NULL DEFAULT '{}',
  action_items TEXT[],
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high'
  status TEXT NOT NULL DEFAULT 'new', -- 'new', 'viewed', 'applied', 'dismissed'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create tracking pixels table for advanced integrations
CREATE TABLE public.tracking_pixels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  widget_id UUID REFERENCES widgets(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'gtm', 'facebook', 'ga4', 'custom'
  pixel_id TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_pixels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketplace_templates
CREATE POLICY "Public can view public templates" ON public.marketplace_templates
FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own templates" ON public.marketplace_templates
FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create templates" ON public.marketplace_templates
FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own templates" ON public.marketplace_templates
FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own templates" ON public.marketplace_templates
FOR DELETE USING (created_by = auth.uid());

-- RLS Policies for template_ratings
CREATE POLICY "Public can view ratings for public templates" ON public.template_ratings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM marketplace_templates 
    WHERE id = template_ratings.template_id AND is_public = true
  )
);

CREATE POLICY "Users can create ratings" ON public.template_ratings
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own ratings" ON public.template_ratings
FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for template_downloads
CREATE POLICY "Users can view their own downloads" ON public.template_downloads
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can track their downloads" ON public.template_downloads
FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for analytics_insights
CREATE POLICY "Users can view their own insights" ON public.analytics_insights
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own insights" ON public.analytics_insights
FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for tracking_pixels
CREATE POLICY "Users can manage their own tracking pixels" ON public.tracking_pixels
FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Create function to update template ratings
CREATE OR REPLACE FUNCTION update_template_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace_templates 
  SET 
    rating_average = (
      SELECT AVG(rating)::DECIMAL(3,2) 
      FROM template_ratings 
      WHERE template_id = NEW.template_id
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM template_ratings 
      WHERE template_id = NEW.template_id
    )
  WHERE id = NEW.template_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rating updates
CREATE TRIGGER update_template_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON template_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_template_rating();

-- Create function to increment download count
CREATE OR REPLACE FUNCTION increment_download_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace_templates 
  SET download_count = download_count + 1
  WHERE id = NEW.template_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for download tracking
CREATE TRIGGER increment_download_count_trigger
  AFTER INSERT ON template_downloads
  FOR EACH ROW
  EXECUTE FUNCTION increment_download_count();

-- Create updated_at trigger for marketplace_templates
CREATE TRIGGER update_marketplace_templates_updated_at
  BEFORE UPDATE ON marketplace_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();