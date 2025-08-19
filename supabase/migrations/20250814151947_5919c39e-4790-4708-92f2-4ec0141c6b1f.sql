-- Create help content management tables
CREATE TABLE public.help_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.help_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  category_id UUID REFERENCES public.help_categories(id) ON DELETE SET NULL,
  video_url TEXT,
  video_type TEXT CHECK (video_type IN ('youtube', 'vimeo', 'direct')),
  featured_image_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  tags TEXT[],
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.help_article_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.help_article_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_helpful BOOLEAN NOT NULL,
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.help_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_article_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_article_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for help_categories
CREATE POLICY "Help categories are viewable by everyone" 
ON public.help_categories 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage help categories" 
ON public.help_categories 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'support')
  )
);

-- Create policies for help_articles
CREATE POLICY "Published help articles are viewable by everyone" 
ON public.help_articles 
FOR SELECT 
USING (is_published = true);

CREATE POLICY "Admins can manage help articles" 
ON public.help_articles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'support')
  )
);

-- Create policies for help_article_views
CREATE POLICY "Users can view their own article views" 
ON public.help_article_views 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can create article views" 
ON public.help_article_views 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all article views" 
ON public.help_article_views 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'support')
  )
);

-- Create policies for help_article_feedback
CREATE POLICY "Users can view feedback on published articles" 
ON public.help_article_feedback 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.help_articles 
    WHERE help_articles.id = article_id 
    AND help_articles.is_published = true
  )
);

CREATE POLICY "Authenticated users can create feedback" 
ON public.help_article_feedback 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own feedback" 
ON public.help_article_feedback 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all feedback" 
ON public.help_article_feedback 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'support')
  )
);

-- Create indexes for performance
CREATE INDEX idx_help_articles_category_id ON public.help_articles(category_id);
CREATE INDEX idx_help_articles_slug ON public.help_articles(slug);
CREATE INDEX idx_help_articles_published ON public.help_articles(is_published);
CREATE INDEX idx_help_articles_featured ON public.help_articles(is_featured);
CREATE INDEX idx_help_articles_tags ON public.help_articles USING GIN(tags);
CREATE INDEX idx_help_categories_slug ON public.help_categories(slug);
CREATE INDEX idx_help_article_views_article_id ON public.help_article_views(article_id);
CREATE INDEX idx_help_article_feedback_article_id ON public.help_article_feedback(article_id);

-- Create full-text search index
CREATE INDEX idx_help_articles_search ON public.help_articles USING GIN(to_tsvector('english', title || ' ' || content || ' ' || COALESCE(excerpt, '')));

-- Create function to update view count
CREATE OR REPLACE FUNCTION increment_article_view_count(article_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.help_articles 
  SET view_count = view_count + 1 
  WHERE id = article_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update helpful count
CREATE OR REPLACE FUNCTION update_article_helpful_count(article_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.help_articles 
  SET helpful_count = (
    SELECT COUNT(*) 
    FROM public.help_article_feedback 
    WHERE article_id = article_uuid AND is_helpful = true
  )
  WHERE id = article_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update timestamps
CREATE TRIGGER update_help_categories_updated_at
BEFORE UPDATE ON public.help_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_help_articles_updated_at
BEFORE UPDATE ON public.help_articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample categories
INSERT INTO public.help_categories (name, description, slug, sort_order) VALUES
('Getting Started', 'Essential guides to get you up and running quickly', 'getting-started', 1),
('Widgets', 'Everything about creating and managing widgets', 'widgets', 2),
('Campaigns', 'Campaign creation and management guides', 'campaigns', 3),
('Analytics', 'Understanding your data and reports', 'analytics', 4),
('Integrations', 'Connect with third-party services', 'integrations', 5),
('Troubleshooting', 'Common issues and solutions', 'troubleshooting', 6),
('Advanced Features', 'Power user guides and advanced configurations', 'advanced-features', 7);

-- Insert sample articles
INSERT INTO public.help_articles (title, slug, content, excerpt, category_id, video_url, video_type, is_featured, tags, sort_order) VALUES
('Welcome to NotiProof', 'welcome-to-notiproof', '# Welcome to NotiProof

NotiProof is a powerful social proof platform that helps you increase conversions by displaying real-time customer activity on your website.

## What is Social Proof?

Social proof is a psychological phenomenon where people follow the actions of others, assuming they''re correct. In e-commerce, this translates to:

- Recent purchases
- Current visitors
- Customer reviews
- Live activity notifications

## Getting Started

1. **Create Your Account**: Sign up for your free NotiProof account
2. **Install the Widget**: Add our lightweight JavaScript code to your website
3. **Configure Notifications**: Choose what type of social proof to display
4. **Monitor Performance**: Track how social proof impacts your conversions

## Key Features

- **Real-time Notifications**: Show live customer activity
- **Customizable Widgets**: Match your brand perfectly
- **Advanced Analytics**: Measure the impact on conversions
- **Easy Integration**: Works with any website platform

Ready to boost your conversions? Let''s get started!', 'Learn the basics of NotiProof and how social proof can increase your website conversions', (SELECT id FROM public.help_categories WHERE slug = 'getting-started'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', true, ARRAY['introduction', 'social-proof', 'conversions'], 1),

('Creating Your First Widget', 'creating-your-first-widget', '# Creating Your First Widget

Widgets are the core of NotiProof - they''re the notifications that appear on your website to show social proof.

## Step 1: Choose Widget Type

Navigate to the Widgets section and click "Create New Widget". You''ll see several types:

- **Recent Activity**: Shows recent purchases or sign-ups
- **Live Visitor Count**: Displays current visitor numbers
- **Customer Reviews**: Showcases positive feedback
- **Inventory Alerts**: Creates urgency with low stock warnings

## Step 2: Configure Your Widget

### Basic Settings
- **Widget Name**: Internal name for your reference
- **Display Message**: What visitors will see
- **Position**: Where on the page it appears
- **Timing**: When and how often to show

### Design Customization
- **Colors**: Match your brand colors
- **Typography**: Choose fonts and sizes
- **Animation**: Select entrance and exit effects
- **Mobile**: Optimize for mobile devices

## Step 3: Set Triggers

Define when your widget should appear:
- **Page Rules**: Specific pages or URL patterns
- **Visitor Behavior**: Time on site, scroll depth
- **Traffic Source**: Different messages for different sources
- **Device Type**: Desktop vs mobile variations

## Step 4: Install on Your Website

Copy the generated code and add it to your website. The widget will start showing immediately.

## Best Practices

1. **Keep it Relevant**: Match the message to the page content
2. **Don''t Overwhelm**: Space out notifications appropriately
3. **Test Different Messages**: A/B test to find what works best
4. **Monitor Performance**: Check analytics regularly

Your first widget is now live and helping increase conversions!', 'Step-by-step guide to creating and configuring your first social proof widget', (SELECT id FROM public.help_categories WHERE slug = 'widgets'), NULL, NULL, true, ARRAY['widgets', 'setup', 'configuration'], 1),

('Understanding Analytics Dashboard', 'understanding-analytics-dashboard', '# Understanding Your Analytics Dashboard

The NotiProof analytics dashboard provides comprehensive insights into how your social proof widgets are performing.

## Key Metrics

### Impressions
- **Total Views**: How many times widgets were displayed
- **Unique Views**: Number of unique visitors who saw widgets
- **View Rate**: Percentage of visitors who saw at least one widget

### Engagement
- **Click-through Rate (CTR)**: Percentage of widget clicks
- **Interaction Time**: How long visitors engage with widgets
- **Conversion Attribution**: Sales attributed to widget views

### Performance by Widget
- **Top Performers**: Which widgets generate most engagement
- **Conversion Impact**: Revenue attributed to each widget
- **A/B Test Results**: Comparative performance data

## Dashboard Sections

### Real-time Overview
Live metrics updating every few seconds:
- Current active visitors
- Widgets displayed in last hour
- Recent conversions
- Live conversion rate

### Historical Trends
- Daily, weekly, monthly performance
- Seasonal patterns
- Growth metrics
- Comparative analysis

### Audience Insights
- Geographic distribution
- Device and browser data
- Traffic source analysis
- Behavioral patterns

## Advanced Analytics

### Custom Events
Track specific actions:
- Newsletter signups
- Add to cart events
- Checkout starts
- Custom conversions

### Funnel Analysis
See how widgets impact your conversion funnel:
- Awareness stage impact
- Consideration phase influence
- Decision stage conversions
- Post-purchase behavior

## Optimization Tips

1. **Regular Monitoring**: Check metrics weekly
2. **Segment Analysis**: Break down by traffic source
3. **Seasonal Adjustments**: Adapt to seasonal patterns
4. **Competitive Benchmarking**: Compare against industry averages

Use these insights to continuously improve your social proof strategy!', 'Comprehensive guide to understanding and using your NotiProof analytics dashboard', (SELECT id FROM public.help_categories WHERE slug = 'analytics'), 'https://vimeo.com/123456789', 'vimeo', false, ARRAY['analytics', 'dashboard', 'metrics'], 1);