-- Add support role to enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'support'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'support';
  END IF;
END $$;

-- Strengthen events table for integrity and moderation
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS ip text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_events_widget_id ON public.events (widget_id);
CREATE INDEX IF NOT EXISTS idx_events_widget_id_created_at ON public.events (widget_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_flagged ON public.events (flagged);

-- Support role read-only access policies with duplicate-safe creation
DO $$ BEGIN
  CREATE POLICY "Support can view all events"
  ON public.events
  FOR SELECT
  USING (has_role(auth.uid(), 'support'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Support can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (has_role(auth.uid(), 'support'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Support can view all widgets"
  ON public.widgets
  FOR SELECT
  USING (has_role(auth.uid(), 'support'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;