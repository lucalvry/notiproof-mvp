-- ========================================
-- Marketplace Templates & Categories Seed
-- ========================================
-- This file seeds comprehensive templates for all 39 campaign types
-- Execute this via Supabase SQL Editor to populate templates

-- First, create template_categories table if it doesn't exist (for reference)
CREATE TABLE IF NOT EXISTS public.template_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- Insert template categories
INSERT INTO public.template_categories (id, name, description, slug, sort_order) VALUES
  ('cat_ecommerce', 'E-Commerce', 'Templates for online stores and retail businesses', 'ecommerce', 1),
  ('cat_saas', 'SaaS & Software', 'Templates for software and subscription services', 'saas', 2),
  ('cat_services', 'Services & Booking', 'Templates for service providers and appointments', 'services', 3),
  ('cat_content', 'Content & Media', 'Templates for blogs, newsletters and media sites', 'content', 4),
  ('cat_social', 'Social & Community', 'Templates for communities and social proof', 'social', 5),
  ('cat_ngo', 'Non-Profit', 'Templates for NGOs and charitable organizations', 'ngo', 6),
  ('cat_education', 'Education', 'Templates for courses and educational platforms', 'education', 7),
  ('cat_general', 'General', 'Versatile templates for any business type', 'general', 8)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  slug = EXCLUDED.slug,
  sort_order = EXCLUDED.sort_order;

-- Create unique index on name column for marketplace_templates
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_templates_name ON public.marketplace_templates(name);

-- ========== E-COMMERCE TEMPLATES (8 types) ==========

-- 1. Recent Purchase
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Recent Purchase Notification',
  'Show real-time purchase notifications to build trust and urgency',
  'cat_ecommerce',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"bottom-left","animation":"slide","message_template":"{{user_name}} from {{location}} just bought {{product_name}}","show_avatar":true,"show_close_button":true,"auto_hide":true,"auto_hide_delay":5000}'::jsonb,
  '{"background_color":"#ffffff","text_color":"#1a202c","accent_color":"#667eea","border_radius":"12px","shadow":"lg","font_size":"14px","padding":"16px","max_width":"380px"}'::jsonb,
  '{"show_duration_ms":5000,"interval_ms":8000,"max_per_page":5,"max_per_session":20,"triggers":{"min_time_on_page_ms":2000,"scroll_depth_pct":0,"exit_intent":false}}'::jsonb,
  ARRAY['ecommerce', 'purchase', 'trust', 'social-proof'],
  ARRAY['ecommerce', 'retail'],
  ARRAY['recent-purchase'],
  true,
  true,
  100
) ON CONFLICT (name) DO UPDATE SET
  template_config = EXCLUDED.template_config,
  style_config = EXCLUDED.style_config,
  display_rules = EXCLUDED.display_rules,
  updated_at = NOW();

-- 2. Cart Additions
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Cart Activity Notification',
  'Display how many people are adding items to their cart',
  'cat_ecommerce',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"bottom-right","animation":"fade","message_template":"{{count}} people added {{product_name}} to cart in the last {{timeframe}}","show_close_button":true,"auto_hide":true,"auto_hide_delay":6000}'::jsonb,
  '{"background_color":"#fef3c7","text_color":"#92400e","accent_color":"#f59e0b","border_radius":"8px","shadow":"md","font_size":"13px","padding":"14px"}'::jsonb,
  '{"show_duration_ms":6000,"interval_ms":10000,"max_per_page":3,"max_per_session":15}'::jsonb,
  ARRAY['cart', 'urgency', 'activity'],
  ARRAY['ecommerce', 'retail'],
  ARRAY['cart-additions'],
  false,
  true,
  90
) ON CONFLICT (name) DO NOTHING;

-- 3. Product Reviews
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Customer Review Display',
  'Showcase real customer reviews with star ratings',
  'cat_ecommerce',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"top-right","animation":"slide","message_template":"{{rating}} \"{{review_text}}\" - {{reviewer_name}}","show_close_button":true,"auto_hide":true,"auto_hide_delay":8000}'::jsonb,
  '{"background_color":"#f0fdf4","text_color":"#14532d","accent_color":"#10b981","border_radius":"10px","shadow":"lg","font_size":"14px","padding":"16px"}'::jsonb,
  '{"show_duration_ms":8000,"interval_ms":12000,"max_per_page":4,"max_per_session":20}'::jsonb,
  ARRAY['reviews', 'trust', 'testimonials'],
  ARRAY['ecommerce', 'retail', 'services'],
  ARRAY['product-reviews'],
  true,
  true,
  95
) ON CONFLICT (name) DO NOTHING;

-- 4. Low Stock Alert
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Low Stock Urgency Alert',
  'Create urgency by showing limited inventory',
  'cat_ecommerce',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"top-center","animation":"bounce","message_template":"Only {{stock_count}} left in stock! {{urgency_text}}","show_close_button":false,"auto_hide":true,"auto_hide_delay":4000}'::jsonb,
  '{"background_color":"#fee2e2","text_color":"#7f1d1d","accent_color":"#dc2626","border_radius":"6px","shadow":"xl","font_size":"15px","padding":"12px 20px","font_weight":"bold"}'::jsonb,
  '{"show_duration_ms":4000,"interval_ms":15000,"max_per_page":2,"max_per_session":8}'::jsonb,
  ARRAY['urgency', 'scarcity', 'fomo'],
  ARRAY['ecommerce', 'retail'],
  ARRAY['low-stock'],
  false,
  true,
  85
) ON CONFLICT (name) DO NOTHING;

-- 5. Visitor Counter  
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Live Visitor Count',
  'Show how many people are viewing your product or page',
  'cat_ecommerce',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"bottom-left","animation":"fade","message_template":"{{visitor_count}} people {{action}} {{target}} right now","show_close_button":true,"auto_hide":false}'::jsonb,
  '{"background_color":"#dbeafe","text_color":"#1e3a8a","accent_color":"#3b82f6","border_radius":"8px","shadow":"md","font_size":"13px","padding":"12px"}'::jsonb,
  '{"show_duration_ms":999999,"interval_ms":5000,"max_per_page":1,"max_per_session":50}'::jsonb,
  ARRAY['activity', 'live', 'engagement'],
  ARRAY['ecommerce', 'saas', 'blog', 'media'],
  ARRAY['visitor-counter'],
  false,
  true,
  80
) ON CONFLICT (name) DO NOTHING;

-- 6. Recently Viewed
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Recently Viewed Alert',
  'Show when someone recently viewed a product',
  'cat_ecommerce',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"bottom-right","animation":"slide","message_template":"{{user_name}} from {{location}} viewed this {{timeframe}}","show_close_button":true,"auto_hide":true,"auto_hide_delay":5000}'::jsonb,
  '{"background_color":"#faf5ff","text_color":"#581c87","accent_color":"#a855f7","border_radius":"10px","shadow":"md","font_size":"14px","padding":"14px"}'::jsonb,
  '{"show_duration_ms":5000,"interval_ms":7000,"max_per_page":5,"max_per_session":25}'::jsonb,
  ARRAY['activity', 'views', 'engagement'],
  ARRAY['ecommerce', 'retail'],
  ARRAY['recently-viewed'],
  false,
  true,
  75
) ON CONFLICT (name) DO NOTHING;

-- 7. Wishlist Additions
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Wishlist Activity',
  'Display wishlist additions to show product popularity',
  'cat_ecommerce',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"top-left","animation":"fade","message_template":"Added to {{count}} wishlists {{timeframe}}","show_close_button":true,"auto_hide":true,"auto_hide_delay":6000}'::jsonb,
  '{"background_color":"#fce7f3","text_color":"#831843","accent_color":"#ec4899","border_radius":"8px","shadow":"md","font_size":"13px","padding":"14px"}'::jsonb,
  '{"show_duration_ms":6000,"interval_ms":10000,"max_per_page":3,"max_per_session":15}'::jsonb,
  ARRAY['wishlist', 'popularity', 'social-proof'],
  ARRAY['ecommerce', 'retail'],
  ARRAY['wishlist-additions'],
  false,
  true,
  70
) ON CONFLICT (name) DO NOTHING;

-- 8. Flash Sale Timer
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Flash Sale Countdown',
  'Create urgency with countdown timers for sales',
  'cat_ecommerce',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"top-center","animation":"bounce","message_template":"{{sale_type}} ends in {{time_remaining}}!","show_close_button":false,"auto_hide":false}'::jsonb,
  '{"background_color":"#fef3c7","text_color":"#78350f","accent_color":"#f59e0b","border_radius":"8px","shadow":"xl","font_size":"16px","padding":"16px 24px","font_weight":"bold"}'::jsonb,
  '{"show_duration_ms":999999,"interval_ms":1000,"max_per_page":1,"max_per_session":999}'::jsonb,
  ARRAY['sale', 'urgency', 'countdown', 'promo'],
  ARRAY['ecommerce', 'retail'],
  ARRAY['flash-sale'],
  true,
  true,
  92
) ON CONFLICT (name) DO NOTHING;

-- ========== SAAS TEMPLATES (5 types) ==========

-- 9. New Signup
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'New User Signup',
  'Celebrate new signups and build credibility',
  'cat_saas',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"bottom-left","animation":"slide","message_template":"{{user_name}} from {{location}} just signed up","show_close_button":true,"auto_hide":true,"auto_hide_delay":5000}'::jsonb,
  '{"background_color":"#ffffff","text_color":"#1a202c","accent_color":"#8b5cf6","border_radius":"10px","shadow":"lg","font_size":"14px","padding":"16px"}'::jsonb,
  '{"show_duration_ms":5000,"interval_ms":8000,"max_per_page":5,"max_per_session":20}'::jsonb,
  ARRAY['signup', 'conversion', 'growth'],
  ARRAY['saas', 'services', 'education', 'blog'],
  ARRAY['new-signup'],
  true,
  true,
  88
) ON CONFLICT (name) DO NOTHING;

-- 10. Trial Start
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Trial Started Notification',
  'Show when users start free trials',
  'cat_saas',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"bottom-right","animation":"fade","message_template":"{{user_name}} started a {{plan_type}} {{timeframe}}","show_close_button":true,"auto_hide":true,"auto_hide_delay":5000}'::jsonb,
  '{"background_color":"#e0f2fe","text_color":"#0c4a6e","accent_color":"#0ea5e9","border_radius":"8px","shadow":"md","font_size":"14px","padding":"14px"}'::jsonb,
  '{"show_duration_ms":5000,"interval_ms":9000,"max_per_page":4,"max_per_session":18}'::jsonb,
  ARRAY['trial', 'freemium', 'conversion'],
  ARRAY['saas'],
  ARRAY['trial-starts'],
  false,
  true,
  82
) ON CONFLICT (name) DO NOTHING;

-- 11. Upgrade Event
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Plan Upgrade Notification',
  'Highlight when users upgrade to premium plans',
  'cat_saas',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"top-right","animation":"slide","message_template":"{{user_name}} upgraded to {{plan_name}}","show_close_button":true,"auto_hide":true,"auto_hide_delay":6000}'::jsonb,
  '{"background_color":"#f0fdf4","text_color":"#14532d","accent_color":"#22c55e","border_radius":"10px","shadow":"lg","font_size":"14px","padding":"16px"}'::jsonb,
  '{"show_duration_ms":6000,"interval_ms":10000,"max_per_page":3,"max_per_session":15}'::jsonb,
  ARRAY['upgrade', 'revenue', 'conversion'],
  ARRAY['saas'],
  ARRAY['upgrade-events'],
  true,
  true,
  90
) ON CONFLICT (name) DO NOTHING;

-- 12. Feature Release
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'New Feature Announcement',
  'Announce new features and updates',
  'cat_saas',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"top-center","animation":"bounce","message_template":"{{emoji}} {{announcement_text}}","show_close_button":true,"auto_hide":true,"auto_hide_delay":8000}'::jsonb,
  '{"background_color":"#fef3c7","text_color":"#78350f","accent_color":"#f59e0b","border_radius":"8px","shadow":"lg","font_size":"15px","padding":"16px 20px","font_weight":"semibold"}'::jsonb,
  '{"show_duration_ms":8000,"interval_ms":20000,"max_per_page":1,"max_per_session":5}'::jsonb,
  ARRAY['announcement', 'feature', 'update'],
  ARRAY['saas', 'technology'],
  ARRAY['feature-releases'],
  false,
  true,
  78
) ON CONFLICT (name) DO NOTHING;

-- 13. User Milestone
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'User Achievement Alert',
  'Celebrate user milestones and achievements',
  'cat_saas',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"bottom-left","animation":"slide","message_template":"{{user_name}} {{achievement}}","show_close_button":true,"auto_hide":true,"auto_hide_delay":6000}'::jsonb,
  '{"background_color":"#faf5ff","text_color":"#581c87","accent_color":"#a855f7","border_radius":"10px","shadow":"md","font_size":"14px","padding":"16px"}'::jsonb,
  '{"show_duration_ms":6000,"interval_ms":10000,"max_per_page":4,"max_per_session":20}'::jsonb,
  ARRAY['achievement', 'engagement', 'gamification'],
  ARRAY['saas', 'education'],
  ARRAY['user-milestones'],
  false,
  true,
  75
) ON CONFLICT (name) DO NOTHING;

-- ========== SERVICES TEMPLATES (4 types) ==========

-- 14. New Booking
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'New Booking Alert',
  'Display new bookings for services and appointments',
  'cat_services',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"bottom-right","animation":"slide","message_template":"{{user_name}} booked {{service_type}} for {{booking_date}}","show_close_button":true,"auto_hide":true,"auto_hide_delay":5000}'::jsonb,
  '{"background_color":"#ffffff","text_color":"#1a202c","accent_color":"#06b6d4","border_radius":"10px","shadow":"lg","font_size":"14px","padding":"16px"}'::jsonb,
  '{"show_duration_ms":5000,"interval_ms":8000,"max_per_page":4,"max_per_session":20}'::jsonb,
  ARRAY['booking', 'appointment', 'conversion'],
  ARRAY['services', 'consulting', 'healthcare', 'beauty', 'fitness'],
  ARRAY['new-bookings'],
  false,
  true,
  85
) ON CONFLICT (name) DO NOTHING;

-- 15. Service Request
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Service Request Notification',
  'Show incoming service requests and quotes',
  'cat_services',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"bottom-left","animation":"fade","message_template":"{{user_location}} {{action}} {{request_type}}","show_close_button":true,"auto_hide":true,"auto_hide_delay":5000}'::jsonb,
  '{"background_color":"#e0f2fe","text_color":"#0c4a6e","accent_color":"#0284c7","border_radius":"8px","shadow":"md","font_size":"14px","padding":"14px"}'::jsonb,
  '{"show_duration_ms":5000,"interval_ms":9000,"max_per_page":4,"max_per_session":18}'::jsonb,
  ARRAY['lead', 'request', 'quote'],
  ARRAY['services', 'consulting', 'real_estate'],
  ARRAY['service-requests'],
  false,
  true,
  80
) ON CONFLICT (name) DO NOTHING;

-- 16. Appointment Scheduled
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Appointment Scheduled',
  'Display newly scheduled appointments',
  'cat_services',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"top-right","animation":"slide","message_template":"{{service_name}} appointment scheduled with {{provider}}","show_close_button":true,"auto_hide":true,"auto_hide_delay":6000}'::jsonb,
  '{"background_color":"#f0fdf4","text_color":"#14532d","accent_color":"#10b981","border_radius":"10px","shadow":"md","font_size":"14px","padding":"16px"}'::jsonb,
  '{"show_duration_ms":6000,"interval_ms":9000,"max_per_page":4,"max_per_session":18}'::jsonb,
  ARRAY['appointment', 'booking', 'calendar'],
  ARRAY['services', 'healthcare', 'consulting'],
  ARRAY['appointment-scheduled'],
  false,
  true,
  78
) ON CONFLICT (name) DO NOTHING;

-- 17. Contact Form
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Contact Form Alert',
  'Show new contact form submissions',
  'cat_services',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"bottom-right","animation":"fade","message_template":"{{user_location}} submitted a contact form {{timeframe}}","show_close_button":true,"auto_hide":true,"auto_hide_delay":5000}'::jsonb,
  '{"background_color":"#e0f2fe","text_color":"#0c4a6e","accent_color":"#0284c7","border_radius":"8px","shadow":"md","font_size":"14px","padding":"14px"}'::jsonb,
  '{"show_duration_ms":5000,"interval_ms":8000,"max_per_page":4,"max_per_session":20}'::jsonb,
  ARRAY['lead', 'contact', 'inquiry'],
  ARRAY['services', 'consulting', 'real_estate', 'ecommerce'],
  ARRAY['contact-forms'],
  false,
  true,
  75
) ON CONFLICT (name) DO NOTHING;

-- ========== CONTENT & MEDIA TEMPLATES (4 types) ==========

-- 18. Newsletter Subscription
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Newsletter Subscription',
  'Highlight new newsletter subscribers',
  'cat_content',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"bottom-left","animation":"slide","message_template":"{{user_name}} from {{location}} subscribed to the newsletter","show_close_button":true,"auto_hide":true,"auto_hide_delay":5000}'::jsonb,
  '{"background_color":"#ffffff","text_color":"#1a202c","accent_color":"#10b981","border_radius":"10px","shadow":"lg","font_size":"14px","padding":"16px"}'::jsonb,
  '{"show_duration_ms":5000,"interval_ms":8000,"max_per_page":5,"max_per_session":20}'::jsonb,
  ARRAY['newsletter', 'subscription', 'growth'],
  ARRAY['blog', 'media', 'news'],
  ARRAY['newsletter-subscriptions'],
  false,
  true,
  82
) ON CONFLICT (name) DO NOTHING;

-- 19. Content Download
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Content Download Alert',
  'Show when users download resources',
  'cat_content',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"bottom-right","animation":"fade","message_template":"{{user_name}} downloaded {{resource_name}}","show_close_button":true,"auto_hide":true,"auto_hide_delay":5000}'::jsonb,
  '{"background_color":"#fef3c7","text_color":"#78350f","accent_color":"#f59e0b","border_radius":"8px","shadow":"md","font_size":"14px","padding":"14px"}'::jsonb,
  '{"show_duration_ms":5000,"interval_ms":9000,"max_per_page":4,"max_per_session":18}'::jsonb,
  ARRAY['download', 'resource', 'lead'],
  ARRAY['blog', 'media', 'saas'],
  ARRAY['content-downloads'],
  false,
  true,
  78
) ON CONFLICT (name) DO NOTHING;

-- 20. Blog Comment
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Blog Comment Notification',
  'Show comment activity on blog posts',
  'cat_content',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"top-right","animation":"slide","message_template":"{{user_name}} commented on \"{{post_title}}\"","show_close_button":true,"auto_hide":true,"auto_hide_delay":6000}'::jsonb,
  '{"background_color":"#f0fdf4","text_color":"#14532d","accent_color":"#10b981","border_radius":"10px","shadow":"md","font_size":"14px","padding":"16px"}'::jsonb,
  '{"show_duration_ms":6000,"interval_ms":10000,"max_per_page":4,"max_per_session":20}'::jsonb,
  ARRAY['comment', 'engagement', 'community'],
  ARRAY['blog', 'media'],
  ARRAY['blog-comments'],
  false,
  true,
  74
) ON CONFLICT (name) DO NOTHING;

-- 21. Social Share
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Social Share Counter',
  'Display social media share counts',
  'cat_content',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"bottom-left","animation":"fade","message_template":"Shared {{share_count}} times on {{platform}}","show_close_button":true,"auto_hide":true,"auto_hide_delay":5000}'::jsonb,
  '{"background_color":"#dbeafe","text_color":"#1e3a8a","accent_color":"#3b82f6","border_radius":"8px","shadow":"md","font_size":"13px","padding":"14px"}'::jsonb,
  '{"show_duration_ms":5000,"interval_ms":8000,"max_per_page":3,"max_per_session":15}'::jsonb,
  ARRAY['social', 'share', 'viral'],
  ARRAY['blog', 'media', 'ecommerce'],
  ARRAY['social-shares'],
  false,
  true,
  70
) ON CONFLICT (name) DO NOTHING;

-- ========== EDUCATION TEMPLATES (2 types) ==========

-- 22. Course Enrollment
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Course Enrollment Alert',
  'Display new course enrollments',
  'cat_education',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"bottom-left","animation":"slide","message_template":"{{user_name}} enrolled in {{course_name}}","show_close_button":true,"auto_hide":true,"auto_hide_delay":5000}'::jsonb,
  '{"background_color":"#ffffff","text_color":"#1a202c","accent_color":"#8b5cf6","border_radius":"10px","shadow":"lg","font_size":"14px","padding":"16px"}'::jsonb,
  '{"show_duration_ms":5000,"interval_ms":8000,"max_per_page":5,"max_per_session":20}'::jsonb,
  ARRAY['enrollment', 'education', 'conversion'],
  ARRAY['education'],
  ARRAY['course-enrollments'],
  true,
  true,
  86
) ON CONFLICT (name) DO NOTHING;

-- 23. Course Completion
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Course Completion Celebration',
  'Celebrate student course completions',
  'cat_education',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"top-right","animation":"bounce","message_template":"🎉 {{user_name}} completed {{course_name}}!","show_close_button":true,"auto_hide":true,"auto_hide_delay":7000}'::jsonb,
  '{"background_color":"#f0fdf4","text_color":"#14532d","accent_color":"#22c55e","border_radius":"10px","shadow":"lg","font_size":"14px","padding":"16px"}'::jsonb,
  '{"show_duration_ms":7000,"interval_ms":12000,"max_per_page":3,"max_per_session":15}'::jsonb,
  ARRAY['completion', 'achievement', 'success'],
  ARRAY['education'],
  ARRAY['course-completions'],
  false,
  true,
  82
) ON CONFLICT (name) DO NOTHING;

-- ========== SOCIAL & COMMUNITY TEMPLATES (2 types) ==========

-- 24. Community Join
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Community Member Join',
  'Welcome new community members',
  'cat_social',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"bottom-right","animation":"slide","message_template":"{{user_name}} joined the community from {{location}}","show_close_button":true,"auto_hide":true,"auto_hide_delay":5000}'::jsonb,
  '{"background_color":"#ffffff","text_color":"#1a202c","accent_color":"#ec4899","border_radius":"10px","shadow":"lg","font_size":"14px","padding":"16px"}'::jsonb,
  '{"show_duration_ms":5000,"interval_ms":8000,"max_per_page":5,"max_per_session":20}'::jsonb,
  ARRAY['community', 'growth', 'engagement'],
  ARRAY['community', 'social'],
  ARRAY['community-joins'],
  false,
  true,
  80
) ON CONFLICT (name) DO NOTHING;

-- 25. User Activity
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'User Activity Notification',
  'Show real-time user activities',
  'cat_social',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"bottom-left","animation":"fade","message_template":"{{user_name}} {{activity_type}} {{timeframe}}","show_close_button":true,"auto_hide":true,"auto_hide_delay":5000}'::jsonb,
  '{"background_color":"#faf5ff","text_color":"#581c87","accent_color":"#a855f7","border_radius":"8px","shadow":"md","font_size":"14px","padding":"14px"}'::jsonb,
  '{"show_duration_ms":5000,"interval_ms":7000,"max_per_page":5,"max_per_session":25}'::jsonb,
  ARRAY['activity', 'engagement', 'community'],
  ARRAY['community', 'social', 'saas'],
  ARRAY['user-activities'],
  false,
  true,
  76
) ON CONFLICT (name) DO NOTHING;

-- ========== NON-PROFIT TEMPLATES (3 types) ==========

-- 26. Donation Received
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Donation Received',
  'Show donor contributions and amounts',
  'cat_ngo',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"bottom-left","animation":"slide","message_template":"{{donor_name}} donated {{amount}} {{timeframe}}","show_close_button":true,"auto_hide":true,"auto_hide_delay":6000}'::jsonb,
  '{"background_color":"#ffffff","text_color":"#1a202c","accent_color":"#10b981","border_radius":"10px","shadow":"lg","font_size":"14px","padding":"16px"}'::jsonb,
  '{"show_duration_ms":6000,"interval_ms":9000,"max_per_page":5,"max_per_session":20}'::jsonb,
  ARRAY['donation', 'fundraising', 'impact'],
  ARRAY['ngo', 'charity'],
  ARRAY['donations'],
  true,
  true,
  88
) ON CONFLICT (name) DO NOTHING;

-- 27. Impact Milestone
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Impact Milestone Celebration',
  'Celebrate organizational impact achievements',
  'cat_ngo',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"top-center","animation":"bounce","message_template":"🎉 {{milestone_text}}!","show_close_button":true,"auto_hide":true,"auto_hide_delay":8000}'::jsonb,
  '{"background_color":"#f0fdf4","text_color":"#14532d","accent_color":"#22c55e","border_radius":"10px","shadow":"xl","font_size":"16px","padding":"16px 20px","font_weight":"bold"}'::jsonb,
  '{"show_duration_ms":8000,"interval_ms":15000,"max_per_page":1,"max_per_session":5}'::jsonb,
  ARRAY['milestone', 'impact', 'celebration'],
  ARRAY['ngo', 'charity'],
  ARRAY['impact-milestones'],
  true,
  true,
  90
) ON CONFLICT (name) DO NOTHING;

-- 28. Volunteer Sign-up
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Volunteer Sign-up Alert',
  'Highlight new volunteer registrations',
  'cat_ngo',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"bottom-right","animation":"fade","message_template":"{{volunteer_name}} signed up to volunteer!","show_close_button":true,"auto_hide":true,"auto_hide_delay":5000}'::jsonb,
  '{"background_color":"#dbeafe","text_color":"#1e3a8a","accent_color":"#3b82f6","border_radius":"8px","shadow":"md","font_size":"14px","padding":"14px"}'::jsonb,
  '{"show_duration_ms":5000,"interval_ms":8000,"max_per_page":4,"max_per_session":18}'::jsonb,
  ARRAY['volunteer', 'engagement', 'community'],
  ARRAY['ngo', 'charity'],
  ARRAY['volunteer-signups'],
  false,
  true,
  82
) ON CONFLICT (name) DO NOTHING;

-- ========== GENERAL TEMPLATE ==========

-- 29. Custom Event
INSERT INTO public.marketplace_templates (
  name, description, category, created_by,
  template_config, style_config, display_rules,
  tags, business_types, supported_campaign_types,
  is_featured, is_public, priority
) VALUES (
  'Custom Event Template',
  'Fully customizable notification for any event type',
  'cat_general',
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
  '{"position":"bottom-left","animation":"slide","message_template":"{{custom_message}}","show_close_button":true,"auto_hide":true,"auto_hide_delay":5000}'::jsonb,
  '{"background_color":"#ffffff","text_color":"#1a202c","accent_color":"#667eea","border_radius":"10px","shadow":"md","font_size":"14px","padding":"16px"}'::jsonb,
  '{"show_duration_ms":5000,"interval_ms":8000,"max_per_page":5,"max_per_session":20}'::jsonb,
  ARRAY['custom', 'flexible', 'general'],
  ARRAY['ecommerce', 'saas', 'services', 'blog', 'media', 'ngo', 'education', 'community', 'real_estate', 'healthcare', 'consulting', 'technology'],
  ARRAY['custom-events'],
  true,
  true,
  60
) ON CONFLICT (name) DO NOTHING;
