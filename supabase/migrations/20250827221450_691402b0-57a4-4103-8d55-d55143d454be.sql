-- Create websites table
CREATE TABLE public.websites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  domain TEXT NOT NULL,
  name TEXT NOT NULL,
  business_type business_type NOT NULL DEFAULT 'saas',
  status TEXT NOT NULL DEFAULT 'active',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_token TEXT,
  favicon_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, domain)
);

-- Enable RLS on websites
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for websites
CREATE POLICY "Users can view their own websites" 
ON public.websites 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own websites" 
ON public.websites 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own websites" 
ON public.websites 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own websites" 
ON public.websites 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add website_id to existing tables
ALTER TABLE public.widgets ADD COLUMN website_id UUID;
ALTER TABLE public.integration_connectors ADD COLUMN website_id UUID;
ALTER TABLE public.events ADD COLUMN website_id UUID;

-- Create function to get user's primary website
CREATE OR REPLACE FUNCTION public.get_user_primary_website(_user_id UUID)
RETURNS UUID AS $$
DECLARE
  website_id UUID;
BEGIN
  SELECT id INTO website_id 
  FROM public.websites 
  WHERE user_id = _user_id 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  RETURN website_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migrate existing widgets to default websites for each user
INSERT INTO public.websites (user_id, domain, name, business_type)
SELECT DISTINCT 
  w.user_id,
  'example-' || w.user_id::text || '.com' as domain,
  'My Website' as name,
  COALESCE(p.business_type, 'saas'::business_type) as business_type
FROM public.widgets w
LEFT JOIN public.profiles p ON p.id = w.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.websites ws WHERE ws.user_id = w.user_id
);

-- Update existing widgets with website_id
UPDATE public.widgets 
SET website_id = public.get_user_primary_website(user_id)
WHERE website_id IS NULL;

-- Update existing integration_connectors with website_id  
UPDATE public.integration_connectors 
SET website_id = public.get_user_primary_website(user_id)
WHERE website_id IS NULL;

-- Update existing events with website_id
UPDATE public.events 
SET website_id = (
  SELECT website_id 
  FROM public.widgets w 
  WHERE w.id = events.widget_id
)
WHERE website_id IS NULL;

-- Make website_id NOT NULL after migration
ALTER TABLE public.widgets ALTER COLUMN website_id SET NOT NULL;
ALTER TABLE public.integration_connectors ALTER COLUMN website_id SET NOT NULL;

-- Update RLS policies to be website-scoped
DROP POLICY IF EXISTS "Users can view their own widgets" ON public.widgets;
CREATE POLICY "Users can view widgets for their websites" 
ON public.widgets 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.websites ws 
  WHERE ws.id = widgets.website_id AND ws.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can insert their own widgets" ON public.widgets;
CREATE POLICY "Users can create widgets for their websites" 
ON public.widgets 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.websites ws 
  WHERE ws.id = widgets.website_id AND ws.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can update their own widgets" ON public.widgets;
CREATE POLICY "Users can update widgets for their websites" 
ON public.widgets 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.websites ws 
  WHERE ws.id = widgets.website_id AND ws.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can delete their own widgets" ON public.widgets;
CREATE POLICY "Users can delete widgets for their websites" 
ON public.widgets 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.websites ws 
  WHERE ws.id = widgets.website_id AND ws.user_id = auth.uid()
));

-- Update integration_connectors RLS policies
DROP POLICY IF EXISTS "Users can manage their own integration connectors" ON public.integration_connectors;
CREATE POLICY "Users can view integration connectors for their websites" 
ON public.integration_connectors 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.websites ws 
  WHERE ws.id = integration_connectors.website_id AND ws.user_id = auth.uid()
));

CREATE POLICY "Users can create integration connectors for their websites" 
ON public.integration_connectors 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.websites ws 
  WHERE ws.id = integration_connectors.website_id AND ws.user_id = auth.uid()
));

CREATE POLICY "Users can update integration connectors for their websites" 
ON public.integration_connectors 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.websites ws 
  WHERE ws.id = integration_connectors.website_id AND ws.user_id = auth.uid()
));

CREATE POLICY "Users can delete integration connectors for their websites" 
ON public.integration_connectors 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.websites ws 
  WHERE ws.id = integration_connectors.website_id AND ws.user_id = auth.uid()
));

-- Create trigger for updating websites updated_at
CREATE TRIGGER update_websites_updated_at
BEFORE UPDATE ON public.websites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();