import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wc-webhook-signature',
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
    const signature = req.headers.get('x-wc-webhook-signature');
    
    if (!signature) {
      console.error('Missing WooCommerce signature');
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse payload
    const data = JSON.parse(payload);
    console.log('WooCommerce webhook received', { 
      order_id: data.id,
      status: data.status
    });

    // Find integration connector by site URL
    const siteUrl = new URL(req.url).searchParams.get('site_url');
    
    if (!siteUrl) {
      return new Response(JSON.stringify({ error: 'Missing site_url parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: connector, error: connectorError } = await supabaseClient
      .from('integration_connectors')
      .select('*, websites!inner(id, user_id, domain)')
      .eq('integration_type', 'woocommerce')
      .eq('status', 'active')
      .ilike('config->>site_url', `%${siteUrl}%`)
      .single();

    if (connectorError || !connector) {
      console.error('Invalid WooCommerce site', connectorError);
      return new Response(JSON.stringify({ error: 'Invalid site configuration' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify HMAC signature
    const secret = connector.config.consumer_secret;
    const hash = createHmac('sha256', secret)
      .update(payload)
      .digest('base64');

    if (hash !== signature) {
      console.error('Invalid WooCommerce signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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

    // Extract order details
    const customerName = `${data.billing?.first_name || ''} ${data.billing?.last_name || ''}`.trim() || 'Someone';
    const location = [data.billing?.city, data.billing?.country].filter(Boolean).join(', ') || null;
    const productNames = data.line_items?.map((item: any) => item.name).join(', ') || 'products';
    
    const message = `${customerName} from ${location || 'your store'} just purchased ${productNames}`;

    // Create event
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .insert({
        widget_id: widget.id,
        event_type: 'purchase',
        message_template: message,
        user_name: customerName,
        user_location: location,
        page_url: connector.websites.domain,
        event_data: {
          order_id: data.id,
          total: data.total,
          currency: data.currency,
          products: data.line_items?.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price
          }))
        },
        source: 'integration',
        integration_type: 'woocommerce',
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
        integration_type: 'woocommerce',
        action: 'order_webhook',
        status: 'success',
        user_id: connector.websites.user_id,
        details: {
          connector_id: connector.id,
          event_id: event.id,
          order_id: data.id
        }
      });

    console.log('WooCommerce event created successfully', { event_id: event.id });

    return new Response(JSON.stringify({ 
      success: true,
      event_id: event.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('WooCommerce webhook error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
