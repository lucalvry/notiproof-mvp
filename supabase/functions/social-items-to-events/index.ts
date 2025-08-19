import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Business context templates for dynamic message generation
const BUSINESS_CONTEXT_TEMPLATES = {
  'ecommerce': {
    'review': '⭐ {author_name} gave us a {rating}-star review: "{content}"',
    'purchase': '🛒 Someone from {location} just purchased {product}',
    'social': '📱 {author_name} mentioned us: "{content}"'
  },
  'saas': {
    'review': '⭐ {author_name} rated us {rating} stars: "{content}"',
    'signup': '🚀 {author_name} from {location} just signed up',
    'social': '💬 {author_name} shared: "{content}"'
  },
  'services': {
    'review': '⭐ {author_name} left a {rating}-star review: "{content}"',
    'booking': '📅 {author_name} from {location} booked a consultation',
    'social': '💼 {author_name} mentioned our services: "{content}"'
  },
  'hospitality': {
    'review': '⭐ {author_name} gave us {rating} stars: "{content}"',
    'booking': '🏨 Someone from {location} just made a reservation',
    'social': '🌟 {author_name} shared their experience: "{content}"'
  },
  'healthcare': {
    'review': '⭐ {author_name} rated our care {rating} stars: "{content}"',
    'appointment': '🏥 Someone from {location} scheduled an appointment',
    'social': '💊 {author_name} shared: "{content}"'
  },
  'retail': {
    'review': '⭐ {author_name} gave us {rating} stars: "{content}"',
    'purchase': '🛍️ Someone from {location} just made a purchase',
    'social': '🏪 {author_name} mentioned us: "{content}"'
  },
  'real_estate': {
    'review': '⭐ {author_name} rated us {rating} stars: "{content}"',
    'inquiry': '🏠 Someone from {location} inquired about a property',
    'social': '🏘️ {author_name} shared: "{content}"'
  },
  'automotive': {
    'review': '⭐ {author_name} gave us {rating} stars: "{content}"',
    'service': '🚗 Someone from {location} scheduled a service',
    'social': '🔧 {author_name} mentioned us: "{content}"'
  },
  'fitness': {
    'review': '⭐ {author_name} rated us {rating} stars: "{content}"',
    'membership': '💪 Someone from {location} joined our gym',
    'social': '🏋️ {author_name} shared: "{content}"'
  },
  'beauty': {
    'review': '⭐ {author_name} gave us {rating} stars: "{content}"',
    'appointment': '💄 Someone from {location} booked an appointment',
    'social': '✨ {author_name} shared: "{content}"'
  },
  'food_beverage': {
    'review': '⭐ {author_name} rated us {rating} stars: "{content}"',
    'order': '🍽️ Someone from {location} just placed an order',
    'social': '🍴 {author_name} mentioned us: "{content}"'
  },
  'travel': {
    'review': '⭐ {author_name} gave us {rating} stars: "{content}"',
    'booking': '✈️ Someone from {location} booked a trip',
    'social': '🌍 {author_name} shared their experience: "{content}"'
  },
  'finance': {
    'review': '⭐ {author_name} rated our service {rating} stars: "{content}"',
    'consultation': '💼 Someone from {location} scheduled a consultation',
    'social': '💰 {author_name} mentioned us: "{content}"'
  },
  'technology': {
    'review': '⭐ {author_name} gave us {rating} stars: "{content}"',
    'demo': '💻 Someone from {location} requested a demo',
    'social': '🔧 {author_name} shared: "{content}"'
  },
  'education': {
    'review': '⭐ {author_name} rated us {rating} stars: "{content}"',
    'enrollment': '🎓 Someone from {location} enrolled in a course',
    'social': '📚 {author_name} shared: "{content}"'
  },
  'consulting': {
    'review': '⭐ {author_name} gave us {rating} stars: "{content}"',
    'consultation': '💡 Someone from {location} booked a consultation',
    'social': '📊 {author_name} mentioned our expertise: "{content}"'
  },
  'manufacturing': {
    'review': '⭐ {author_name} rated us {rating} stars: "{content}"',
    'inquiry': '🏭 Someone from {location} inquired about our products',
    'social': '⚙️ {author_name} mentioned us: "{content}"'
  },
  'media': {
    'review': '⭐ {author_name} gave us {rating} stars: "{content}"',
    'engagement': '📺 Someone from {location} engaged with our content',
    'social': '🎬 {author_name} shared: "{content}"'
  },
  'legal': {
    'review': '⭐ {author_name} rated our service {rating} stars: "{content}"',
    'consultation': '⚖️ Someone from {location} scheduled a consultation',
    'social': '📋 {author_name} mentioned us: "{content}"'
  },
  'events': {
    'review': '⭐ {author_name} rated our event {rating} stars: "{content}"',
    'registration': '🎫 Someone from {location} registered for an event',
    'social': '🎉 {author_name} shared: "{content}"'
  },
  'blog': {
    'review': '⭐ {author_name} gave us {rating} stars: "{content}"',
    'subscription': '📝 Someone from {location} subscribed to our newsletter',
    'social': '📖 {author_name} shared: "{content}"'
  },
  'marketing_agency': {
    'review': '⭐ {author_name} rated us {rating} stars: "{content}"',
    'consultation': '📈 Someone from {location} requested a strategy consultation',
    'social': '🎯 {author_name} mentioned our services: "{content}"'
  },
  'ngo': {
    'review': '⭐ {author_name} gave us {rating} stars: "{content}"',
    'donation': '❤️ Someone from {location} made a donation',
    'social': '🤝 {author_name} shared our cause: "{content}"'
  }
};

function generateContextualMessage(item: any, businessType: string, widget: any): { message: string, context: any, template: string } {
  const templates = BUSINESS_CONTEXT_TEMPLATES[businessType] || BUSINESS_CONTEXT_TEMPLATES['services'];
  
  // Determine event type based on social item
  let eventType = 'social';
  if (item.type === 'review') {
    eventType = 'review';
  }
  
  // Get appropriate template
  const template = templates[eventType] || templates['social'] || '{author_name} mentioned us: "{content}"';
  
  // Extract location intelligently
  let location = 'Verified Customer';
  if (item.content) {
    const content = item.content.toLowerCase();
    if (content.includes('lagos')) location = 'Lagos, Nigeria';
    else if (content.includes('abuja')) location = 'Abuja, Nigeria';
    else if (content.includes('port harcourt')) location = 'Port Harcourt, Nigeria';
    else if (content.includes('kano')) location = 'Kano, Nigeria';
    else if (content.includes('enugu')) location = 'Enugu, Nigeria';
    else if (content.includes('accra')) location = 'Accra, Ghana';
    else if (content.includes('ibadan')) location = 'Ibadan, Nigeria';
  }
  
  // Build context data
  const context = {
    author_name: item.author_name || 'Someone',
    content: item.content || 'Great experience!',
    rating: item.rating || 5,
    location: location,
    business_type: businessType,
    event_type: eventType,
    source: 'social_connector'
  };
  
  // Generate message using template
  let message = template;
  Object.keys(context).forEach(key => {
    const placeholder = `{${key}}`;
    message = message.replace(new RegExp(placeholder, 'g'), context[key]);
  });
  
  return { message, context, template };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { connector_id, widget_id } = await req.json();

    if (!connector_id || !widget_id) {
      return new Response(JSON.stringify({ 
        error: 'Both connector_id and widget_id are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get widget and user profile to determine business context
    const { data: widget, error: widgetError } = await supabase
      .from('widgets')
      .select(`
        *,
        profiles:user_id (business_type)
      `)
      .eq('id', widget_id)
      .single();

    if (widgetError || !widget) {
      return new Response(JSON.stringify({ 
        error: 'Widget not found or inaccessible' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const businessType = widget.profiles?.business_type || 'services';

    // Get approved social items that haven't been converted to events yet
    const { data: socialItems, error: fetchError } = await supabase
      .from('social_items')
      .select('*')
      .eq('connector_id', connector_id)
      .eq('moderation_status', 'approved')
      .eq('converted_to_event', false);

    if (fetchError) {
      console.error('Error fetching social items:', fetchError);
      throw fetchError;
    }

    if (!socialItems || socialItems.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No approved social items to convert',
        events_created: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Convert social items to events with dynamic business context
    const events = socialItems.map(item => {
      const { message, context, template } = generateContextualMessage(item, businessType, widget);

      return {
        widget_id: widget_id,
        event_type: context.event_type,
        event_data: {
          message: message,
          author_name: item.author_name,
          author_avatar: item.author_avatar,
          rating: item.rating,
          source: 'social_connector',
          connector_id: connector_id,
          social_item_id: item.id,
          posted_at: item.posted_at,
          source_url: item.source_url,
          original_content: item.content
        },
        user_name: item.author_name,
        user_location: context.location,
        message_template: message, // Keep for backward compatibility
        context_template: template, // New flexible template
        business_context: context, // Rich context data
        business_type: businessType,
        source: 'connector',
        status: 'approved', // Already approved in social_items
        flagged: false,
        created_at: new Date().toISOString()
      };
    });

    // Insert events
    const { error: insertError } = await supabase
      .from('events')
      .insert(events);

    if (insertError) {
      console.error('Error inserting events:', insertError);
      throw insertError;
    }

    // Mark social items as converted
    const socialItemIds = socialItems.map(item => item.id);
    
    const { error: updateError } = await supabase
      .from('social_items')
      .update({ converted_to_event: true })
      .in('id', socialItemIds);

    if (updateError) {
      console.error('Error updating social items:', updateError);
      // Don't throw here as events were created successfully
    }

    console.log(`Successfully converted ${events.length} social items to events for widget ${widget_id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      events_created: events.length,
      widget_id: widget_id,
      connector_id: connector_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in social-items-to-events function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});