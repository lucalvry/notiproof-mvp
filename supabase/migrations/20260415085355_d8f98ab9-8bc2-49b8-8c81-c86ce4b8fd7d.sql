-- CRITICAL FIX 1: Events RLS - Remove anonymous access to PII
DROP POLICY IF EXISTS "Widget API can access events for active widgets" ON events;

-- CRITICAL FIX 2: Visitor Journeys - Remove "anyone can update" policy
DROP POLICY IF EXISTS "Anyone can update journeys" ON visitor_journeys;

-- CRITICAL FIX 3: Visitor Sessions - Fix overly permissive UPDATE policy
DROP POLICY IF EXISTS "Widget owners can update visitor sessions" ON visitor_sessions;

CREATE POLICY "Owners can update their widget sessions"
ON visitor_sessions FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM widgets w
    WHERE w.id = visitor_sessions.widget_id
    AND w.user_id = auth.uid()
  )
);

-- CRITICAL FIX 4: Remove visitor_sessions from Realtime publication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'visitor_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE visitor_sessions;
  END IF;
END $$;

-- WARNING FIX: Remove duplicate testimonial_forms anon policy
DROP POLICY IF EXISTS "Public can view active testimonial forms" ON testimonial_forms;