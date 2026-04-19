
DROP POLICY IF EXISTS "Anyone can insert journeys" ON public.visitor_journeys;

CREATE POLICY "Public widgets can insert journeys for known websites"
  ON public.visitor_journeys
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.websites w
      WHERE w.id = visitor_journeys.website_id
        AND w.deleted_at IS NULL
    )
  );
