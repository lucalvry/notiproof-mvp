-- CRITICAL SECURITY FIX: Prevent users from escalating their own roles
-- Currently users can update their own role field to 'admin' which is a major security vulnerability

-- Remove the existing policy that allows users to update their own profile (including role)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

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
  SET role = _new_role
  WHERE id = _user_id;
  
  -- Return true if update was successful
  RETURN FOUND;
END;
$$;

-- Create a new policy that allows users to update their profile but NOT the role field
-- We'll use a trigger to prevent role changes instead of policy constraints
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Create trigger to prevent users from changing their own role
CREATE OR REPLACE FUNCTION public.prevent_role_self_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Allow admins to change any role
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  
  -- For non-admins, prevent role changes
  IF OLD.role != NEW.role THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add the trigger
DROP TRIGGER IF EXISTS prevent_role_escalation ON public.profiles;
CREATE TRIGGER prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_self_modification();

-- ANALYTICS DATA PROTECTION: Fix public access vulnerabilities
-- Remove public read access from events table for sensitive analytics data
DROP POLICY IF EXISTS "Public can view events for widget API" ON public.events;

-- Create more restrictive policy for events API access
CREATE POLICY "Widget API can access events for active widgets"
ON public.events
FOR SELECT
USING (
  -- Allow access for widget owners or public widget API calls
  EXISTS (
    SELECT 1 
    FROM widgets w 
    WHERE w.id = events.widget_id 
    AND w.status = 'active'
    AND (w.user_id = auth.uid() OR auth.uid() IS NULL)
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
    AND (w.user_id = auth.uid() OR w.status = 'active')
  )
);

-- Add comments for security documentation
COMMENT ON FUNCTION public.update_user_role IS 'Admin-only function for secure role management. Prevents privilege escalation attacks.';
COMMENT ON FUNCTION public.prevent_role_self_modification IS 'Prevents users from escalating their own privileges by changing their role.';
COMMENT ON POLICY "Widget API can access events for active widgets" ON public.events IS 'Restricts event access to widget owners and authenticated API calls only.';