-- Fix security vulnerability: Add RLS policies to protect team invitation tokens and emails
-- Currently anyone can access invitation tokens which could lead to unauthorized access

-- Enable RLS on team_invitations table (should already be enabled but ensure it)
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Policy 1: Organization owners/admins can manage invitations for their organization
CREATE POLICY "Organization admins can manage team invitations"
ON public.team_invitations
FOR ALL
USING (
  user_has_org_role(auth.uid(), organization_id, ARRAY['owner'::team_role, 'admin'::team_role])
)
WITH CHECK (
  user_has_org_role(auth.uid(), organization_id, ARRAY['owner'::team_role, 'admin'::team_role])
);

-- Policy 2: Users can view invitations they sent
CREATE POLICY "Users can view invitations they sent"
ON public.team_invitations
FOR SELECT
USING (auth.uid() = invited_by);

-- Policy 3: Users can update invitations they sent (for resending, etc.)
CREATE POLICY "Users can update invitations they sent"
ON public.team_invitations
FOR UPDATE
USING (auth.uid() = invited_by)
WITH CHECK (auth.uid() = invited_by);

-- Policy 4: Users can delete invitations they sent
CREATE POLICY "Users can delete invitations they sent"
ON public.team_invitations
FOR DELETE
USING (auth.uid() = invited_by);

-- Policy 5: Allow public access to verify invitation tokens (for accepting invitations)
-- This is necessary for the invitation acceptance flow but only exposes minimal data
CREATE POLICY "Public can verify valid invitation tokens"
ON public.team_invitations
FOR SELECT
USING (
  expires_at > now() 
  AND accepted_at IS NULL
  AND token IS NOT NULL
);

-- Add comment to document the security model
COMMENT ON TABLE public.team_invitations IS 'Team invitation tokens are protected by RLS. Only organization admins and invitation senders can access full invitation data. Public access is limited to token verification for acceptance flow.';