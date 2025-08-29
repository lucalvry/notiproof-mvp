-- Seed the quick_win_templates table with starter templates
INSERT INTO public.quick_win_templates (
  name, description, business_type, event_type, template_message, 
  required_fields, default_metadata, category, is_active
) VALUES 
-- E-commerce templates
('Recent Purchase', 'Show recent customer purchases', 'ecommerce', 'purchase', 
 'Someone from {location} just bought {product}!', 
 '["product", "location"]'::jsonb, 
 '{"product": "Premium Sneakers", "location": "Lagos"}'::jsonb, 
 'sales', true),

('Cart Activity', 'Show items being added to cart', 'ecommerce', 'cart', 
 '{customer} from {location} just added {product} to their cart', 
 '["customer", "location", "product"]'::jsonb, 
 '{"customer": "John", "location": "Abuja", "product": "Wireless Headphones"}'::jsonb, 
 'engagement', true),

('Product Views', 'Show product interest', 'ecommerce', 'view', 
 '{count} people are viewing {product} right now!', 
 '["count", "product"]'::jsonb, 
 '{"count": "5", "product": "Latest Collection"}'::jsonb, 
 'social_proof', true),

-- SaaS templates
('New Signup', 'Show new user registrations', 'saas', 'conversion', 
 'Someone from {location} just started their free trial!', 
 '["location"]'::jsonb, 
 '{"location": "Port Harcourt"}'::jsonb, 
 'conversions', true),

('Feature Usage', 'Show active feature usage', 'saas', 'engagement', 
 '{user} from {location} just used {feature}', 
 '["user", "location", "feature"]'::jsonb, 
 '{"user": "Sarah", "location": "Kano", "feature": "Advanced Analytics"}'::jsonb, 
 'engagement', true),

('Upgrade Activity', 'Show plan upgrades', 'saas', 'upgrade', 
 'Someone just upgraded to {plan} plan!', 
 '["plan"]'::jsonb, 
 '{"plan": "Premium"}'::jsonb, 
 'conversions', true),

-- Services templates
('Consultation Booked', 'Show consultation bookings', 'services', 'booking', 
 '{client} from {location} just booked a consultation', 
 '["client", "location"]'::jsonb, 
 '{"client": "David", "location": "Ibadan"}'::jsonb, 
 'bookings', true),

('Service Request', 'Show service inquiries', 'services', 'contact', 
 'Someone from {location} just requested a quote for {service}', 
 '["location", "service"]'::jsonb, 
 '{"location": "Enugu", "service": "Digital Marketing"}'::jsonb, 
 'leads', true),

-- Education templates
('Course Enrollment', 'Show new enrollments', 'education', 'enrollment', 
 '{student} just enrolled in {course}!', 
 '["student", "course"]'::jsonb, 
 '{"student": "Amina", "course": "Digital Marketing Masterclass"}'::jsonb, 
 'enrollments', true),

('Study Sessions', 'Show active learning', 'education', 'activity', 
 '{count} students are currently studying {topic}', 
 '["count", "topic"]'::jsonb, 
 '{"count": "12", "topic": "React Development"}'::jsonb, 
 'engagement', true),

-- Agency/Marketing templates
('Client Success', 'Show client achievements', 'marketing_agency', 'success', 
 'We just helped {client} achieve {result}!', 
 '["client", "result"]'::jsonb, 
 '{"client": "TechCorp", "result": "300% increase in leads"}'::jsonb, 
 'social_proof', true),

('Strategy Session', 'Show consultation bookings', 'marketing_agency', 'booking', 
 'Someone from {location} just booked a strategy session', 
 '["location"]'::jsonb, 
 '{"location": "Victoria Island"}'::jsonb, 
 'bookings', true),

-- Blog/Content templates
('Article Views', 'Show content engagement', 'blog', 'engagement', 
 '{count} people are reading "{article}" right now', 
 '["count", "article"]'::jsonb, 
 '{"count": "8", "article": "10 Digital Marketing Tips"}'::jsonb, 
 'engagement', true),

('Newsletter Signup', 'Show newsletter subscriptions', 'blog', 'subscription', 
 'Someone from {location} just subscribed to our newsletter!', 
 '["location"]'::jsonb, 
 '{"location": "Accra"}'::jsonb, 
 'conversions', true),

-- Non-profit templates
('Donation Activity', 'Show recent donations', 'ngo', 'donation', 
 'Someone from {location} just donated ₦{amount} to support our cause!', 
 '["location", "amount"]'::jsonb, 
 '{"location": "Kaduna", "amount": "5,000"}'::jsonb, 
 'donations', true),

('Volunteer Signup', 'Show volunteer registrations', 'ngo', 'volunteer', 
 '{volunteer} just signed up to volunteer for {program}!', 
 '["volunteer", "program"]'::jsonb, 
 '{"volunteer": "Grace", "program": "Community Outreach"}'::jsonb, 
 'volunteers', true);