-- Phase 1: Display Rules, Triggers, Goals
-- 1) Add display_rules JSONB to widgets with sensible defaults
ALTER TABLE public.widgets
ADD COLUMN IF NOT EXISTS display_rules jsonb NOT NULL DEFAULT jsonb_build_object(
  'show_duration_ms', 5000,
  'interval_ms', 8000,
  'max_per_page', 5,
  'max_per_session', 20,
  'url_allowlist', jsonb_build_array(),
  'url_denylist', jsonb_build_array(),
  'referrer_allowlist', jsonb_build_array(),
  'referrer_denylist', jsonb_build_array(),
  'triggers', jsonb_build_object(
    'min_time_on_page_ms', 0,
    'scroll_depth_pct', 0,
    'exit_intent', false
  ),
  'enforce_verified_only', false,
  'geo_allowlist', jsonb_build_array(),
  'geo_denylist', jsonb_build_array()
);

-- 2) Create goals table per widget
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('url_match', 'custom_event', 'label')),
  pattern text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add FK to widgets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'goals_widget_id_fkey'
  ) THEN
    ALTER TABLE public.goals
      ADD CONSTRAINT goals_widget_id_fkey FOREIGN KEY (widget_id)
      REFERENCES public.widgets(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS for goals
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Policies for goals
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all goals') THEN
    CREATE POLICY "Admins can manage all goals"
    ON public.goals FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view goals for their widgets') THEN
    CREATE POLICY "Users can view goals for their widgets"
    ON public.goals FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.widgets w
        WHERE w.id = goals.widget_id AND w.user_id = auth.uid()
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert goals for their widgets') THEN
    CREATE POLICY "Users can insert goals for their widgets"
    ON public.goals FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.widgets w
        WHERE w.id = goals.widget_id AND w.user_id = auth.uid()
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update goals for their widgets') THEN
    CREATE POLICY "Users can update goals for their widgets"
    ON public.goals FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.widgets w
        WHERE w.id = goals.widget_id AND w.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.widgets w
        WHERE w.id = goals.widget_id AND w.user_id = auth.uid()
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete goals for their widgets') THEN
    CREATE POLICY "Users can delete goals for their widgets"
    ON public.goals FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.widgets w
        WHERE w.id = goals.widget_id AND w.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_goals_widget_id ON public.goals(widget_id);
CREATE INDEX IF NOT EXISTS idx_goals_widget_type ON public.goals(widget_id, type);
