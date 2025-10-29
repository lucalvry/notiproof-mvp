import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const connectorId = url.searchParams.get('connector_id');
    
    if (!connectorId) {
      throw new Error('connector_id is required');
    }

    const { data: connector } = await supabase
      .from('integration_connectors')
      .select('*')
      .eq('id', connectorId)
      .eq('integration_type', 'webflow')
      .single();

    if (!connector) {
      throw new Error('Invalid connector');
    }

    const payload = await req.json();
    console.log('Webflow webhook received:', payload);

    // Rate limiting
    const { count } = await supabase
      .from('integration_logs')
      .select('*', { count: 'exact', head: true })
      .eq('integration_type', 'webflow')
      .gte('created_at', new Date(Date.now() - 10000).toISOString());

    if (count && count > 10) {
      return new Response('Rate limit exceeded', { status: 429, headers: corsHeaders });
    }

    // Extract event data from Webflow payload
    const triggerType = payload.triggerType || payload._type;
    const userName = payload.name || payload.email?.split('@')[0];
    
    let eventType = 'form_submission';
    let messageTemplate = `${userName || 'Someone'} just submitted a form`;
    
    if (triggerType === 'ecommerce_order_created') {
      eventType = 'purchase';
      messageTemplate = `${userName || 'Someone'} just placed an order`;
    } else if (triggerType === 'form_submission') {
      eventType = 'form_submission';
      messageTemplate = `${userName || 'Someone'} just submitted a form`;
    }

    const { data: widget } = await supabase
      .from('widgets')
      .select('id')
      .eq('user_id', connector.user_id)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (!widget) {
      throw new Error('No active widget found');
    }

    await supabase
      .from('events')
      .insert({
        widget_id: widget.id,
        event_type: eventType,
        event_data: payload,
        user_name: userName,
        message_template: messageTemplate,
        source: 'integration',
        status: 'approved',
      });

    await supabase
      .from('integration_connectors')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', connectorId);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing Webflow webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
