-- Create widget_impressions table for tracking actual widget views
CREATE TABLE IF NOT EXISTS public.widget_impressions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  widget_id UUID NOT NULL,
  event_id UUID,
  session_id TEXT NOT NULL,
  page_url TEXT NOT NULL,
  user_agent TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.widget_impressions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can insert impressions for active widgets" 
ON public.widget_impressions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM widgets w 
    WHERE w.id = widget_impressions.widget_id 
    AND w.status = 'active'
  )
);

CREATE POLICY "Users can view impressions for their widgets" 
ON public.widget_impressions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM widgets w 
    WHERE w.id = widget_impressions.widget_id 
    AND w.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all impressions" 
ON public.widget_impressions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add indexes for performance
CREATE INDEX idx_widget_impressions_widget_id ON public.widget_impressions(widget_id);
CREATE INDEX idx_widget_impressions_created_at ON public.widget_impressions(created_at);
CREATE INDEX idx_widget_impressions_session_id ON public.widget_impressions(session_id);