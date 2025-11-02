import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const url = new URL(req.url);
    const websiteId = url.searchParams.get('website_id');

    if (!websiteId) {
      return new Response(JSON.stringify({ error: 'website_id parameter required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: widgets } = await supabase
      .from('widgets')
      .select('id, user_id')
      .eq('website_id', websiteId)
      .limit(1);

    if (!widgets || widgets.length === 0) {
      return new Response(JSON.stringify({ error: 'No widget found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const widget = widgets[0];
    const eventType = body.type;

    let eventData: any = null;

    if (eventType === 'track') {
      const eventName = body.event;
      const properties = body.properties || {};
      
      eventData = {
        widget_id: widget.id,
        event_type: getEventType(eventName),
        user_name: body.userId || properties.name,
        user_email: body.traits?.email || properties.email,
        user_location: properties.city || properties.country,
        message_template: formatEventMessage(eventName, properties),
        event_data: {
          event_name: eventName,
          properties: properties,
        },
        source: 'integration',
        integration_type: 'segment',
        moderation_status: 'approved',
      };
    } else if (eventType === 'identify') {
      eventData = {
        widget_id: widget.id,
        event_type: 'conversion',
        user_name: body.traits?.name,
        user_email: body.traits?.email,
        message_template: `${body.traits?.name || 'Someone'} just signed up`,
        event_data: {
          user_id: body.userId,
          traits: body.traits,
        },
        source: 'integration',
        integration_type: 'segment',
        moderation_status: 'approved',
      };
    }

    if (eventData) {
      const { error: insertError } = await supabase.from('events').insert(eventData);
      
      if (insertError) {
        console.error('Error inserting event:', insertError);
        throw insertError;
      }

      await supabase.from('integration_logs').insert({
        integration_type: 'segment',
        action: `webhook_${eventType}`,
        status: 'success',
        user_id: widget.user_id,
        details: { event_type: eventType, event_name: body.event },
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Segment Webhook Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getEventType(eventName: string): string {
  const name = eventName.toLowerCase();
  if (name.includes('purchase') || name.includes('order') || name.includes('checkout')) {
    return 'purchase';
  } else if (name.includes('signup') || name.includes('register')) {
    return 'conversion';
  }
  return 'visitor';
}

function formatEventMessage(eventName: string, properties: any): string {
  const name = properties.name || 'Someone';
  return `${name} ${eventName.toLowerCase().replace(/_/g, ' ')}`;
}
