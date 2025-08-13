-- Add RLS policies for integration_hooks table
CREATE POLICY "Users can manage their own integration hooks" 
ON public.integration_hooks 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all integration hooks" 
ON public.integration_hooks 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));