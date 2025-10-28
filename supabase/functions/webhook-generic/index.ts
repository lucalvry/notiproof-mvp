import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-token',
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

    // Get webhook token from header or query param
    const webhookToken = req.headers.get('x-webhook-token') || 
                        new URL(req.url).searchParams.get('token');

    if (!webhookToken) {
      console.error('Missing webhook token');
      return new Response(JSON.stringify({ error: 'Missing webhook token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find integration connector by webhook token
    const { data: connector, error: connectorError } = await supabaseClient
      .from('integration_connectors')
      .select('*, websites!inner(id, user_id, domain)')
      .eq('config->>webhook_token', webhookToken)
      .in('integration_type', ['webhook', 'zapier'])
      .eq('status', 'active')
      .single();

    if (connectorError || !connector) {
      console.error('Invalid webhook token', connectorError);
      return new Response(JSON.stringify({ error: 'Invalid webhook token' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payload = await req.json();
    console.log('Generic webhook received', { 
      connector_id: connector.id,
      website_id: connector.website_id,
      payload_keys: Object.keys(payload)
    });

    // Get field mapping from connector config
    const fieldMapping = connector.config.field_mapping || {};
    
    // Extract fields using mapping
    const extractField = (path: string, defaultValue: any = null) => {
      if (!path) return defaultValue;
      const keys = path.split('.');
      let value = payload;
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          return defaultValue;
        }
      }
      return value;
    };

    const eventData = {
      event_type: extractField(fieldMapping.event_type, 'conversion'),
      message_template: extractField(fieldMapping.message, 'New activity detected'),
      user_name: extractField(fieldMapping.user_name, null),
      user_location: extractField(fieldMapping.user_location, null),
      page_url: extractField(fieldMapping.page_url, null),
      event_data: {
        raw_payload: payload,
        ...Object.entries(fieldMapping.custom_fields || {}).reduce((acc, [key, path]) => {
          acc[key] = extractField(path as string);
          return acc;
        }, {} as Record<string, any>)
      }
    };

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
        error: 'No active widget configured',
        message: 'Please create and activate a widget first'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create event
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .insert({
        widget_id: widget.id,
        event_type: eventData.event_type,
        message_template: eventData.message_template,
        user_name: eventData.user_name,
        user_location: eventData.user_location,
        page_url: eventData.page_url || connector.websites.domain,
        event_data: eventData.event_data,
        source: 'integration',
        integration_type: connector.integration_type,
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
        integration_type: connector.integration_type,
        action: 'webhook_received',
        status: 'success',
        user_id: connector.websites.user_id,
        details: {
          connector_id: connector.id,
          event_id: event.id,
          payload_size: JSON.stringify(payload).length
        }
      });

    console.log('Event created successfully', { event_id: event.id });

    return new Response(JSON.stringify({ 
      success: true,
      event_id: event.id,
      message: 'Webhook processed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
