-- Step 1: Create security definer functions to break RLS recursion

-- Function to get user's team memberships without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_team_memberships(_user_id uuid)
RETURNS TABLE(organization_id uuid, role team_role)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO ''
AS $$
  SELECT tm.organization_id, tm.role
  FROM public.team_members tm
  WHERE tm.user_id = _user_id;
$$;

-- Function to check if user has specific role in organization
CREATE OR REPLACE FUNCTION public.user_has_org_role(_user_id uuid, _org_id uuid, _roles team_role[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id = _user_id 
      AND tm.organization_id = _org_id 
      AND tm.role = ANY(_roles)
  );
$$;

-- Step 2: Drop problematic RLS policies on team_members
DROP POLICY IF EXISTS "Team members can view their team" ON public.team_members;
DROP POLICY IF EXISTS "Organization admins can manage team members" ON public.team_members;

-- Step 3: Recreate policies using security definer functions
CREATE POLICY "Team members can view their team" 
ON public.team_members 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.get_user_team_memberships(auth.uid()) gutm 
    WHERE gutm.organization_id = team_members.organization_id
  )
);

CREATE POLICY "Organization admins can manage team members" 
ON public.team_members 
FOR ALL 
USING (
  public.user_has_org_role(auth.uid(), team_members.organization_id, ARRAY['owner'::team_role, 'admin'::team_role])
);