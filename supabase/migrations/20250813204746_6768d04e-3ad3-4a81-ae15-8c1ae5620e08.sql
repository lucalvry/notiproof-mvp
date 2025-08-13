-- Create visitor_sessions table for live visitor tracking
CREATE TABLE public.visitor_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  widget_id UUID NOT NULL REFERENCES public.widgets(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  page_url TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view visitor sessions for their widgets" 
ON public.visitor_sessions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.widgets w 
  WHERE w.id = visitor_sessions.widget_id 
  AND w.user_id = auth.uid()
));

CREATE POLICY "Public can insert visitor sessions for active widgets" 
ON public.visitor_sessions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.widgets w 
  WHERE w.id = visitor_sessions.widget_id 
  AND w.status = 'active'
));

CREATE POLICY "Public can update visitor sessions" 
ON public.visitor_sessions 
FOR UPDATE 
USING (true);

CREATE POLICY "Admins can view all visitor sessions" 
ON public.visitor_sessions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_visitor_sessions_widget_id ON public.visitor_sessions(widget_id);
CREATE INDEX idx_visitor_sessions_active ON public.visitor_sessions(widget_id, is_active, last_seen_at);
CREATE INDEX idx_visitor_sessions_session_id ON public.visitor_sessions(session_id);

-- Enable realtime
ALTER publication supabase_realtime ADD TABLE public.visitor_sessions;