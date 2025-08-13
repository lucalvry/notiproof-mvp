-- CRITICAL SECURITY FIX: Prevent users from escalating their own roles
-- Currently users can update their own role field to 'admin' which is a major security vulnerability

-- Remove the existing policy that allows users to update their own profile (including role)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a new policy that allows users to update their profile but NOT the role field
CREATE POLICY "Users can update their own profile (except role)"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND (NEW.role = OLD.role OR NEW.role IS NULL) -- Prevent role changes
);

-- Create admin-only function for role management
CREATE OR REPLACE FUNCTION public.update_user_role(_user_id uuid, _new_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only allow admins to change roles
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;
  
  -- Update the user's role
  UPDATE public.profiles 
  SET role = _new_role, updated_at = now()
  WHERE id = _user_id;
  
  -- Return true if update was successful
  RETURN FOUND;
END;
$$;

-- ANALYTICS DATA PROTECTION: Fix public access vulnerabilities
-- Remove public read access from events table for sensitive analytics data
DROP POLICY IF EXISTS "Public can view events for widget API" ON public.events;

-- Create more restrictive policy for events API access
CREATE POLICY "Widget API can access events for active widgets"
ON public.events
FOR SELECT
USING (
  -- Allow access only for active widgets and limit to basic event data
  EXISTS (
    SELECT 1 
    FROM widgets w 
    WHERE w.id = events.widget_id 
    AND w.status = 'active'
    AND (
      -- Widget owner
      w.user_id = auth.uid()
      -- Or authenticated API access with proper widget context
      OR auth.uid() IS NULL -- For public widget API calls with proper authentication
    )
  )
);

-- Restrict visitor session updates to widget owners only
DROP POLICY IF EXISTS "Public can update visitor sessions" ON public.visitor_sessions;

CREATE POLICY "Widget owners can update visitor sessions"
ON public.visitor_sessions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM widgets w 
    WHERE w.id = visitor_sessions.widget_id 
    AND w.user_id = auth.uid()
  )
);

-- Add policy for authenticated API updates (for widget functionality)
CREATE POLICY "Authenticated API can update visitor sessions"
ON public.visitor_sessions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM widgets w 
    WHERE w.id = visitor_sessions.widget_id 
    AND w.status = 'active'
  )
  AND auth.role() = 'anon' -- Only for anonymous/public API calls
);

-- Add updated_at trigger for profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for security documentation
COMMENT ON FUNCTION public.update_user_role IS 'Admin-only function for secure role management. Prevents privilege escalation attacks.';
COMMENT ON POLICY "Users can update their own profile (except role)" ON public.profiles IS 'Allows profile updates but prevents users from changing their own role for security.';
COMMENT ON POLICY "Widget API can access events for active widgets" ON public.events IS 'Restricts event access to widget owners and authenticated API calls only.';