-- Indexes and trigger for performance and integrity, plus RLS for user event deletion

-- 1) Create helpful indexes on events
CREATE INDEX IF NOT EXISTS idx_events_widget_id ON public.events (widget_id);
CREATE INDEX IF NOT EXISTS idx_events_widget_id_created_at ON public.events (widget_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events (created_at DESC);
-- Partial index to speed queries for unflagged recent events
CREATE INDEX IF NOT EXISTS idx_events_unflagged_recent ON public.events (created_at DESC) WHERE flagged = false;

-- 2) Create indexes on widgets
CREATE INDEX IF NOT EXISTS idx_widgets_user_id ON public.widgets (user_id);
CREATE INDEX IF NOT EXISTS idx_widgets_status ON public.widgets (status);

-- 3) Ensure updated_at is auto-maintained on widgets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_widgets_updated_at'
  ) THEN
    CREATE TRIGGER update_widgets_updated_at
    BEFORE UPDATE ON public.widgets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 4) Optional FK from events.widget_id to widgets.id (safe add + validate)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_events_widget'
      AND table_schema = 'public'
      AND table_name = 'events'
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT fk_events_widget
      FOREIGN KEY (widget_id)
      REFERENCES public.widgets(id)
      ON DELETE CASCADE
      NOT VALID;
    ALTER TABLE public.events VALIDATE CONSTRAINT fk_events_widget;
  END IF;
END $$;

-- 5) RLS: allow users to delete events for their widgets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'events'
      AND policyname = 'Users can delete events for their widgets'
  ) THEN
    CREATE POLICY "Users can delete events for their widgets"
    ON public.events
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.widgets w
        WHERE w.id = events.widget_id AND w.user_id = auth.uid()
      )
    );
  END IF;
END $$;
