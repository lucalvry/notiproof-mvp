-- Create enums for business types, event sources, and statuses
CREATE TYPE business_type AS ENUM (
  'ecommerce',
  'saas', 
  'services',
  'events',
  'blog',
  'marketing_agency',
  'ngo',
  'education'
);

CREATE TYPE event_source AS ENUM (
  'manual',
  'connector',
  'tracking', 
  'demo'
);

CREATE TYPE event_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- Extend events table with new standardized schema fields
ALTER TABLE public.events 
ADD COLUMN business_type business_type,
ADD COLUMN user_name TEXT,
ADD COLUMN user_location TEXT,
ADD COLUMN page_url TEXT,
ADD COLUMN message_template TEXT,
ADD COLUMN source event_source DEFAULT 'manual',
ADD COLUMN status event_status DEFAULT 'pending',
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;

-- Add business_type to profiles table
ALTER TABLE public.profiles 
ADD COLUMN business_type business_type DEFAULT 'saas';

-- Create demo events generation function
CREATE OR REPLACE FUNCTION generate_demo_events(_user_id UUID, _business_type business_type)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  demo_messages TEXT[];
  demo_widget_id UUID;
  i INTEGER;
BEGIN
  -- Get or create a demo widget for this user
  SELECT id INTO demo_widget_id 
  FROM widgets 
  WHERE user_id = _user_id 
  AND name = 'Demo Widget'
  LIMIT 1;
  
  IF demo_widget_id IS NULL THEN
    INSERT INTO widgets (user_id, name, template_name, status)
    VALUES (_user_id, 'Demo Widget', 'notification', 'active')
    RETURNING id INTO demo_widget_id;
  END IF;

  -- Define demo messages based on business type
  CASE _business_type
    WHEN 'ecommerce' THEN
      demo_messages := ARRAY[
        'Bola from Lagos just bought a pair of sneakers',
        'Someone from Abuja added a product to cart',
        'Kemi from Port Harcourt completed checkout',
        'A customer from Kano just made a purchase',
        'David from Ibadan added items worth ₦25,000 to cart'
      ];
    WHEN 'saas' THEN
      demo_messages := ARRAY[
        'John from Accra just started a free trial',
        'Ada from Port Harcourt scheduled a demo',
        'Someone from Lagos upgraded to Pro plan',
        'Tunde from Abuja signed up for the platform',
        'A user from Enugu just activated premium features'
      ];
    WHEN 'services' THEN
      demo_messages := ARRAY[
        'David just booked a discovery call',
        'Mary submitted a service request form',
        'Someone from Lagos scheduled a consultation',
        'Chioma from Abuja requested a quote',
        'A client from Port Harcourt booked an appointment'
      ];
    WHEN 'events' THEN
      demo_messages := ARRAY[
        'Kemi from Abuja just registered for the webinar',
        '2 people are viewing the event page right now',
        'Someone from Lagos bought an event ticket',
        'Emeka from Enugu joined the conference',
        'A participant from Kano registered for the workshop'
      ];
    WHEN 'blog' THEN
      demo_messages := ARRAY[
        '5 people are reading this article right now',
        'Chinedu from Lagos subscribed to the newsletter',
        'Someone just downloaded our free guide',
        'Ada from Abuja shared this post',
        'A reader from Port Harcourt left a comment'
      ];
    WHEN 'marketing_agency' THEN
      demo_messages := ARRAY[
        'A new client inquiry form was submitted',
        'Sade just downloaded our marketing guide',
        'Someone from Lagos requested a strategy consultation',
        'A business owner from Abuja booked a discovery call',
        'Tope from Enugu signed up for our newsletter'
      ];
    WHEN 'ngo' THEN
      demo_messages := ARRAY[
        'Emeka from Enugu just donated ₦5,000',
        'A volunteer signed up for our next outreach',
        'Someone from Lagos became a monthly supporter',
        'Amina from Kano registered for our program',
        'A donor from Abuja shared our cause'
      ];
    WHEN 'education' THEN
      demo_messages := ARRAY[
        'Tunde just enrolled in Digital Marketing 101',
        'Ngozi booked a counseling session',
        'Someone from Lagos started a new course',
        'A student from Abuja completed their assignment',
        'Kehinde from Port Harcourt joined our study group'
      ];
    ELSE
      demo_messages := ARRAY[
        'Someone just visited your website',
        'A visitor from Lagos engaged with your content',
        'Someone from Abuja signed up for updates'
      ];
  END CASE;

  -- Insert demo events (5 events per business type)
  FOR i IN 1..5 LOOP
    INSERT INTO events (
      widget_id,
      event_type,
      event_data,
      business_type,
      user_name,
      user_location,
      page_url,
      message_template,
      source,
      status,
      expires_at,
      created_at
    ) VALUES (
      demo_widget_id,
      CASE _business_type
        WHEN 'ecommerce' THEN 'purchase'
        WHEN 'saas' THEN 'conversion'
        WHEN 'services' THEN 'conversion'
        WHEN 'events' THEN 'conversion'
        WHEN 'blog' THEN 'visitor'
        WHEN 'marketing_agency' THEN 'conversion'
        WHEN 'ngo' THEN 'conversion'
        WHEN 'education' THEN 'conversion'
        ELSE 'visitor'
      END,
      jsonb_build_object(
        'message', demo_messages[i],
        'demo', true
      ),
      _business_type,
      CASE 
        WHEN i % 2 = 0 THEN split_part(demo_messages[i], ' ', 1)
        ELSE NULL
      END,
      CASE 
        WHEN demo_messages[i] LIKE '%Lagos%' THEN 'Lagos, Nigeria'
        WHEN demo_messages[i] LIKE '%Abuja%' THEN 'Abuja, Nigeria'
        WHEN demo_messages[i] LIKE '%Port Harcourt%' THEN 'Port Harcourt, Nigeria'
        WHEN demo_messages[i] LIKE '%Kano%' THEN 'Kano, Nigeria'
        WHEN demo_messages[i] LIKE '%Enugu%' THEN 'Enugu, Nigeria'
        WHEN demo_messages[i] LIKE '%Accra%' THEN 'Accra, Ghana'
        WHEN demo_messages[i] LIKE '%Ibadan%' THEN 'Ibadan, Nigeria'
        ELSE 'Nigeria'
      END,
      'https://example.com',
      demo_messages[i],
      'demo',
      'approved',
      NOW() + INTERVAL '7 days',
      NOW() - (INTERVAL '1 hour' * (i-1))
    );
  END LOOP;
END;
$$;

-- Create function to auto-generate demo events for new users
CREATE OR REPLACE FUNCTION auto_generate_demo_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Generate demo events for new user after a short delay
  PERFORM generate_demo_events(NEW.id, COALESCE(NEW.business_type, 'saas'));
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate demo events for new users
CREATE TRIGGER trigger_auto_demo_events
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_demo_events();

-- Create function to clean up expired demo events
CREATE OR REPLACE FUNCTION cleanup_expired_demo_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM events 
  WHERE source = 'demo' 
  AND expires_at < NOW();
END;
$$;