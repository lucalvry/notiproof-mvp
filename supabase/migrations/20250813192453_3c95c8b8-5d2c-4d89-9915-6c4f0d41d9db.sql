-- Phase 5: Social Proof Sources
CREATE TABLE public.social_connectors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'google_reviews', 'twitter', 'instagram'
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}', -- API keys, URLs, etc.
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'disabled', 'error'
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.social_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connector_id UUID NOT NULL,
  external_id TEXT NOT NULL, -- Original ID from the source
  type TEXT NOT NULL, -- 'review', 'tweet', 'post'
  content TEXT NOT NULL,
  author_name TEXT,
  author_avatar TEXT,
  rating INTEGER, -- For reviews (1-5)
  source_url TEXT,
  posted_at TIMESTAMP WITH TIME ZONE,
  moderation_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  moderated_by UUID,
  moderated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(connector_id, external_id)
);

-- Phase 6: Team Collaboration
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TYPE public.team_role AS ENUM ('owner', 'admin', 'member', 'viewer');

CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role team_role NOT NULL DEFAULT 'member',
  invited_by UUID,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  joined_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  email TEXT NOT NULL,
  role team_role NOT NULL DEFAULT 'member',
  token TEXT UNIQUE NOT NULL,
  invited_by UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, email)
);

-- Phase 7: Templates Marketplace
CREATE TABLE public.template_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.widget_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID,
  template_name TEXT NOT NULL,
  style_config JSONB NOT NULL DEFAULT '{}',
  display_rules JSONB NOT NULL DEFAULT '{}',
  preview_image TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  downloads_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.template_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.widget_template_tags (
  template_id UUID NOT NULL,
  tag_id UUID NOT NULL,
  PRIMARY KEY (template_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.social_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_template_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Social Connectors
CREATE POLICY "Users can manage their own connectors" 
ON public.social_connectors 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all connectors" 
ON public.social_connectors 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for Social Items
CREATE POLICY "Users can view items from their connectors" 
ON public.social_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM social_connectors sc 
  WHERE sc.id = social_items.connector_id AND sc.user_id = auth.uid()
));

CREATE POLICY "Users can manage items from their connectors" 
ON public.social_items 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM social_connectors sc 
  WHERE sc.id = social_items.connector_id AND sc.user_id = auth.uid()
));

CREATE POLICY "Admins can view all social items" 
ON public.social_items 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for Organizations
CREATE POLICY "Team members can view their organizations" 
ON public.organizations 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM team_members tm 
  WHERE tm.organization_id = organizations.id AND tm.user_id = auth.uid()
));

CREATE POLICY "Users can create organizations" 
ON public.organizations 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Organization owners can update" 
ON public.organizations 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM team_members tm 
  WHERE tm.organization_id = organizations.id AND tm.user_id = auth.uid() AND tm.role = 'owner'
));

-- RLS Policies for Team Members
CREATE POLICY "Team members can view their team" 
ON public.team_members 
FOR SELECT 
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM team_members tm 
  WHERE tm.organization_id = team_members.organization_id AND tm.user_id = auth.uid()
));

CREATE POLICY "Organization admins can manage team members" 
ON public.team_members 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM team_members tm 
  WHERE tm.organization_id = team_members.organization_id 
  AND tm.user_id = auth.uid() 
  AND tm.role IN ('owner', 'admin')
));

-- RLS Policies for Templates
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

-- Template categories and tags are public read
CREATE POLICY "Everyone can view template categories" 
ON public.template_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Everyone can view template tags" 
ON public.template_tags 
FOR SELECT 
USING (true);

CREATE POLICY "Everyone can view template tag relationships" 
ON public.widget_template_tags 
FOR SELECT 
USING (true);

-- Add indexes for performance
CREATE INDEX idx_social_connectors_user_id ON public.social_connectors(user_id);
CREATE INDEX idx_social_items_connector_id ON public.social_items(connector_id);
CREATE INDEX idx_social_items_moderation_status ON public.social_items(moderation_status);
CREATE INDEX idx_team_members_organization_id ON public.team_members(organization_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_widget_templates_public ON public.widget_templates(is_public) WHERE is_public = true;
CREATE INDEX idx_widget_templates_featured ON public.widget_templates(is_featured) WHERE is_featured = true;

-- Add triggers for updated_at
CREATE TRIGGER update_social_connectors_updated_at
  BEFORE UPDATE ON public.social_connectors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_widget_templates_updated_at
  BEFORE UPDATE ON public.widget_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default template categories
INSERT INTO public.template_categories (name, description) VALUES
('E-commerce', 'Templates for online stores and shops'),
('SaaS', 'Templates for software as a service applications'),
('Blogs', 'Templates for blogs and content websites'),
('Landing Pages', 'Templates for marketing and landing pages'),
('Education', 'Templates for educational platforms'),
('Healthcare', 'Templates for healthcare and medical websites');

-- Insert common tags
INSERT INTO public.template_tags (name) VALUES
('conversion'),
('urgency'),
('testimonial'),
('announcement'),
('sale'),
('new-feature'),
('social-proof'),
('reviews'),
('signup'),
('newsletter');

-- Add organization_id to existing tables
ALTER TABLE public.widgets ADD COLUMN organization_id UUID;
ALTER TABLE public.campaigns ADD COLUMN organization_id UUID;

-- Update widgets to use organization or personal ownership
CREATE POLICY "Users can view widgets in their organizations" 
ON public.widgets 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  (organization_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.organization_id = widgets.organization_id AND tm.user_id = auth.uid()
  ))
);

-- Update campaigns for organization support  
CREATE POLICY "Users can view campaigns in their organizations" 
ON public.campaigns 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  (organization_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.organization_id = campaigns.organization_id AND tm.user_id = auth.uid()
  ))
);