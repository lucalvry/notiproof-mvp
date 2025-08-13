-- Create template categories table
CREATE TABLE public.template_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create template tags table  
CREATE TABLE public.template_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create widget templates table
CREATE TABLE public.widget_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  preview_image TEXT,
  category_id UUID REFERENCES public.template_categories(id),
  created_by UUID NOT NULL,
  style_config JSONB NOT NULL DEFAULT '{}',
  display_rules JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  downloads_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create widget template tags junction table
CREATE TABLE public.widget_template_tags (
  template_id UUID NOT NULL REFERENCES public.widget_templates(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.template_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (template_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_template_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for template_categories
CREATE POLICY "Everyone can view template categories" 
ON public.template_categories 
FOR SELECT 
USING (true);

-- RLS Policies for template_tags
CREATE POLICY "Everyone can view template tags" 
ON public.template_tags 
FOR SELECT 
USING (true);

-- RLS Policies for widget_templates
CREATE POLICY "Everyone can view public templates" 
ON public.widget_templates 
FOR SELECT 
USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can manage their own templates" 
ON public.widget_templates 
FOR ALL 
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can manage all templates" 
ON public.widget_templates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for widget_template_tags
CREATE POLICY "Everyone can view template tag relationships" 
ON public.widget_template_tags 
FOR SELECT 
USING (true);

-- Add update trigger for widget_templates
CREATE TRIGGER update_widget_templates_updated_at
BEFORE UPDATE ON public.widget_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample template categories
INSERT INTO public.template_categories (name, description) VALUES
('E-commerce', 'Templates for online stores and shopping sites'),
('SaaS', 'Templates for software and service businesses'),
('Content', 'Templates for blogs and content sites'),
('Landing Page', 'Templates for marketing and landing pages'),
('Corporate', 'Templates for corporate and business sites');

-- Insert sample template tags
INSERT INTO public.template_tags (name) VALUES
('Recent Activity'),
('Purchase Notifications'),
('User Signups'),
('Reviews'),
('Social Proof'),
('Urgency'),
('Trust'),
('Engagement');

-- Insert sample widget templates
INSERT INTO public.widget_templates (
  template_name, name, description, category_id, created_by, 
  style_config, display_rules, is_public, is_featured, downloads_count
) 
SELECT 
  'recent-activity',
  'Recent Activity Notifications',
  'Show live customer activity to build trust and urgency',
  c.id,
  (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1),
  '{"position": "bottom-left", "theme": "modern", "animation": "slide"}',
  '{"show_duration_ms": 5000, "interval_ms": 8000, "max_per_page": 5}',
  true,
  true,
  156
FROM public.template_categories c WHERE c.name = 'E-commerce'

UNION ALL

SELECT 
  'purchase-popup',
  'Purchase Notifications',
  'Display recent purchases to create social proof',
  c.id,
  (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1),
  '{"position": "bottom-right", "theme": "elegant", "animation": "fade"}',
  '{"show_duration_ms": 4000, "interval_ms": 10000, "max_per_page": 3}',
  true,
  true,
  98
FROM public.template_categories c WHERE c.name = 'E-commerce'

UNION ALL

SELECT 
  'signup-counter',
  'User Signup Counter',
  'Show live user registrations and signups',
  c.id,
  (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1),
  '{"position": "top-right", "theme": "minimal", "animation": "bounce"}',
  '{"show_duration_ms": 6000, "interval_ms": 12000, "max_per_page": 2}',
  true,
  false,
  67
FROM public.template_categories c WHERE c.name = 'SaaS'

UNION ALL

SELECT 
  'review-showcase',
  'Customer Reviews',
  'Display customer reviews and testimonials',
  c.id,
  (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1),
  '{"position": "bottom-center", "theme": "card", "animation": "slide"}',
  '{"show_duration_ms": 7000, "interval_ms": 15000, "max_per_page": 1}',
  true,
  false,
  143
FROM public.template_categories c WHERE c.name = 'Content'

UNION ALL

SELECT 
  'live-visitors',
  'Live Visitor Count',
  'Show current number of active visitors',
  c.id,
  (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1),
  '{"position": "top-left", "theme": "compact", "animation": "pulse"}',
  '{"show_duration_ms": 0, "interval_ms": 5000, "max_per_page": 1}',
  true,
  true,
  201
FROM public.template_categories c WHERE c.name = 'Landing Page';

-- Link templates with tags
INSERT INTO public.widget_template_tags (template_id, tag_id)
SELECT wt.id, tt.id
FROM public.widget_templates wt, public.template_tags tt
WHERE (wt.template_name = 'recent-activity' AND tt.name IN ('Recent Activity', 'Social Proof', 'Trust'))
   OR (wt.template_name = 'purchase-popup' AND tt.name IN ('Purchase Notifications', 'Social Proof', 'Urgency'))
   OR (wt.template_name = 'signup-counter' AND tt.name IN ('User Signups', 'Social Proof', 'Engagement'))
   OR (wt.template_name = 'review-showcase' AND tt.name IN ('Reviews', 'Trust', 'Social Proof'))
   OR (wt.template_name = 'live-visitors' AND tt.name IN ('Recent Activity', 'Engagement', 'Social Proof'));