-- Remove auto demo events trigger from profiles table
DROP TRIGGER IF EXISTS trigger_auto_demo_events ON public.profiles;

-- Remove auto generate demo events function since it's no longer needed
DROP FUNCTION IF EXISTS public.auto_generate_demo_events();

-- Keep generate_demo_events() function for manual generation (no changes needed)