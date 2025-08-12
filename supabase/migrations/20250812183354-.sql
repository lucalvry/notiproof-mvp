-- Step 2: create support read-only policies (now safe to reference enum value)
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