import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, calendly-webhook-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.text();
    const signature = req.headers.get('calendly-webhook-signature');
    
    if (!signature) {
      console.error('Missing Calendly signature');
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse payload
    const data = JSON.parse(payload);
    console.log('Calendly webhook received', { 
      event: data.event
    });

    // Get webhook token from query param
    const webhookToken = new URL(req.url).searchParams.get('token');
    
    if (!webhookToken) {
      return new Response(JSON.stringify({ error: 'Missing token parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find integration connector by webhook token
    const { data: connector, error: connectorError } = await supabaseClient
      .from('integration_connectors')
      .select('*, websites!inner(id, user_id, domain)')
      .eq('config->>webhook_token', webhookToken)
      .eq('integration_type', 'calendly')
      .eq('status', 'active')
      .single();

    if (connectorError || !connector) {
      console.error('Invalid webhook token', connectorError);
      return new Response(JSON.stringify({ error: 'Invalid webhook token' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify HMAC signature if signing key is configured
    if (connector.config.signing_key) {
      const expectedSignature = createHmac('sha256', connector.config.signing_key)
        .update(payload)
        .digest('base64');

      if (expectedSignature !== signature) {
        console.error('Invalid Calendly signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Get widget for this website
    const { data: widget } = await supabaseClient
      .from('widgets')
      .select('id')
      .eq('website_id', connector.website_id)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (!widget) {
      console.error('No active widget found for website', connector.website_id);
      return new Response(JSON.stringify({ 
        error: 'No active widget configured'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle different event types
    const eventType = data.event;
    let message = '';
    let eventCategory = 'conversion';

    if (eventType === 'invitee.created') {
      const invitee = data.payload;
      const name = invitee.name || 'Someone';
      const eventName = invitee.event?.name || 'a meeting';
      message = `${name} just scheduled ${eventName}`;
      eventCategory = 'conversion';
    } else if (eventType === 'invitee.canceled') {
      const invitee = data.payload;
      const name = invitee.name || 'Someone';
      message = `${name} canceled their appointment`;
      eventCategory = 'visitor';
    } else {
      message = 'New Calendly activity';
    }

    // Create event
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .insert({
        widget_id: widget.id,
        event_type: eventCategory,
        message_template: message,
        user_name: data.payload?.name || null,
        user_location: null,
        page_url: connector.websites.domain,
        event_data: {
          event_type: eventType,
          invitee_email: data.payload?.email,
          event_name: data.payload?.event?.name,
          scheduled_at: data.payload?.scheduled_event?.start_time,
          calendly_uri: data.payload?.uri
        },
        source: 'integration',
        integration_type: 'calendly',
        status: 'approved'
      })
      .select()
      .single();

    if (eventError) {
      console.error('Failed to create event', eventError);
      throw eventError;
    }

    // Log integration activity
    await supabaseClient
      .from('integration_logs')
      .insert({
        integration_type: 'calendly',
        action: eventType,
        status: 'success',
        user_id: connector.websites.user_id,
        details: {
          connector_id: connector.id,
          event_id: event.id,
          calendly_event: eventType
        }
      });

    console.log('Calendly event created successfully', { event_id: event.id });

    return new Response(JSON.stringify({ 
      success: true,
      event_id: event.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Calendly webhook error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
