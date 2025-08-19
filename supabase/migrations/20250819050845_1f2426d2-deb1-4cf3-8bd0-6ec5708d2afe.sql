-- Update widget API query to include demo events and fix demo events generation

-- First, let's update the generate_demo_events function to properly set views and clicks
CREATE OR REPLACE FUNCTION public.generate_demo_events(_user_id uuid, _business_type business_type)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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

  -- Insert demo events (5 events per business type) with proper views and clicks
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
      views,
      clicks,
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
      1, -- Set views to 1 for demo events
      CASE WHEN i % 3 = 0 THEN 1 ELSE 0 END, -- Set clicks to 1 for every third demo event
      NOW() - (INTERVAL '1 hour' * (i-1))
    );
  END LOOP;
END;
$function$;