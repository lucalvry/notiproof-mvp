-- Fix security vulnerability: Remove public access to full widget configurations
-- The current policy allows competitors to view all widget configurations

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view active widgets for API" ON public.widgets;

-- The widget-api and javascript-api edge functions should use service role
-- to access widget data when needed, not rely on public policies
-- This ensures only authenticated users can see their own widget configurations

-- Add a comment to document why we removed public access
COMMENT ON TABLE public.widgets IS 'Widget configurations contain sensitive business data and should only be accessible to widget owners and admin/support roles. Edge functions use service role for API access.';