-- Enable realtime for visitor_sessions table
ALTER TABLE public.visitor_sessions REPLICA IDENTITY FULL;

-- Add visitor_sessions to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitor_sessions;