-- Phase 1: Expand event system for Natural vs Quick-Win events

-- Update event source enum to include quick_win
ALTER TYPE event_source ADD VALUE IF NOT EXISTS 'quick_win';

-- Create quick-win templates table
CREATE TABLE IF NOT EXISTS public.quick_win_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  business_type business_type NOT NULL,
  event_type TEXT NOT NULL,
  template_message TEXT NOT NULL,
  required_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user quick-win configurations table
CREATE TABLE IF NOT EXISTS public.user_quick_wins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES quick_win_templates(id) ON DELETE CASCADE,
  widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  custom_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, template_id, widget_id)
);

-- Enable RLS on new tables
ALTER TABLE public.quick_win_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quick_wins ENABLE ROW LEVEL SECURITY;

-- RLS policies for quick_win_templates
CREATE POLICY "Everyone can view active quick-win templates"
  ON public.quick_win_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage quick-win templates"
  ON public.quick_win_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for user_quick_wins
CREATE POLICY "Users can manage their own quick-wins"
  ON public.user_quick_wins FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view quick-wins for their widgets"
  ON public.user_quick_wins FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM widgets w 
    WHERE w.id = user_quick_wins.widget_id 
    AND w.user_id = auth.uid()
  ));

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_quick_win_templates_updated_at
  BEFORE UPDATE ON public.quick_win_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_quick_wins_updated_at
  BEFORE UPDATE ON public.user_quick_wins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default quick-win templates
INSERT INTO public.quick_win_templates (name, description, business_type, event_type, template_message, required_fields, default_metadata, category) VALUES
-- Ecommerce templates
('Discount Coupon', 'Show discount offers to encourage purchases', 'ecommerce', 'offer', 'Get {discount}% OFF with coupon {coupon_code} (valid until {expiry_date})', '["discount", "coupon_code", "expiry_date"]'::jsonb, '{"discount": "20", "coupon_code": "SAVE20", "expiry_date": "Friday"}'::jsonb, 'promotion'),
('Free Shipping', 'Promote free shipping offers', 'ecommerce', 'offer', 'Free shipping for orders over ₦{min_amount} 🚚', '["min_amount"]'::jsonb, '{"min_amount": "10000"}'::jsonb, 'promotion'),
('Limited Time Deal', 'Create urgency with time-limited offers', 'ecommerce', 'offer', 'Only {quantity} left in stock! Order now ⏰', '["quantity", "product"]'::jsonb, '{"quantity": "5", "product": "this item"}'::jsonb, 'urgency'),

-- SaaS templates
('Free Trial', 'Promote free trial signup', 'saas', 'offer', 'Start your {trial_days}-day free trial → {trial_link}', '["trial_days", "trial_link"]'::jsonb, '{"trial_days": "7", "trial_link": "#"}'::jsonb, 'promotion'),
('Feature Announcement', 'Announce new features', 'saas', 'announcement', 'New: {feature_name} is now available! {cta_text}', '["feature_name", "cta_text"]'::jsonb, '{"feature_name": "Advanced Analytics", "cta_text": "Try it now"}'::jsonb, 'feature'),
('Limited Access', 'Create exclusivity for early access', 'saas', 'offer', 'Early access: First {limit} users get premium features free', '["limit"]'::jsonb, '{"limit": "100"}'::jsonb, 'urgency'),

-- Services templates
('Consultation Offer', 'Promote free consultations', 'services', 'offer', 'Book a free {service_type} consultation → {booking_link}', '["service_type", "booking_link"]'::jsonb, '{"service_type": "strategy", "booking_link": "#"}'::jsonb, 'promotion'),
('Service Discount', 'Show service discounts', 'services', 'offer', '{discount}% off {service_name} for new clients', '["discount", "service_name"]'::jsonb, '{"discount": "25", "service_name": "web design"}'::jsonb, 'promotion'),

-- Events templates
('Early Bird', 'Promote early bird pricing', 'events', 'offer', 'Early bird: Save {discount}% on {event_name} tickets', '["discount", "event_name"]'::jsonb, '{"discount": "30", "event_name": "Tech Conference 2024"}'::jsonb, 'promotion'),
('Limited Seats', 'Create urgency with seat availability', 'events', 'offer', 'Only {seats_left} seats left for {event_name}!', '["seats_left", "event_name"]'::jsonb, '{"seats_left": "15", "event_name": "Marketing Workshop"}'::jsonb, 'urgency'),

-- General templates
('Social Proof Boost', 'Show credibility indicators', 'saas', 'announcement', 'Trusted by {customer_count}+ businesses worldwide', '["customer_count"]'::jsonb, '{"customer_count": "500"}'::jsonb, 'credibility'),
('New Customer Welcome', 'Welcome message for new visitors', 'ecommerce', 'announcement', 'Welcome! Use {welcome_code} for {discount}% off your first order', '["welcome_code", "discount"]'::jsonb, '{"welcome_code": "WELCOME10", "discount": "10"}'::jsonb, 'welcome');