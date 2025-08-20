-- Add notification_types field to widgets table to store selected notification preferences
ALTER TABLE public.widgets 
ADD COLUMN notification_types jsonb DEFAULT '[]'::jsonb;