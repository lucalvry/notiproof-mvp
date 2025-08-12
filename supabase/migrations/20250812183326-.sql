-- Step 1: enum change and table/index updates (must be committed before policy uses)
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

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS ip text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_events_widget_id ON public.events (widget_id);
CREATE INDEX IF NOT EXISTS idx_events_widget_id_created_at ON public.events (widget_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_flagged ON public.events (flagged);
