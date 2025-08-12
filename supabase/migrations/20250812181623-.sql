-- Performance indexes for events table
CREATE INDEX IF NOT EXISTS idx_events_widget_id ON public.events (widget_id);
CREATE INDEX IF NOT EXISTS idx_events_widget_id_created_at ON public.events (widget_id, created_at DESC);