import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wc-webhook-source, x-wc-webhook-topic, x-wc-webhook-signature',
};

interface WooCommerceOrder {
  id: number;
  number: string;
  status: string;
  total: string;
  currency: string;
  date_created: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    city: string;
    country: string;
  };
  line_items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

serve(async (req) => {
  console.log(`WooCommerce webhook received: ${req.method} ${req.url}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get headers for verification
    const wcTopic = req.headers.get('x-wc-webhook-topic');
    const wcSource = req.headers.get('x-wc-webhook-source');
    const wcSignature = req.headers.get('x-wc-webhook-signature');
    const contentType = req.headers.get('content-type') || '';

    console.log(`WooCommerce webhook - Topic: ${wcTopic}, Source: ${wcSource}, Content-Type: ${contentType}`);

    // Handle different content types
    let requestBody: any;
    const requestText = await req.text();
    console.log(`Raw request body: ${requestText}`);

    if (contentType.includes('application/json')) {
      try {
        requestBody = JSON.parse(requestText);
        console.log(`Processing WooCommerce order ${requestBody.number} for ${requestBody.billing?.email}`);
      } catch (error) {
        console.error('Failed to parse JSON:', error);
        return new Response('Invalid JSON', { 
          status: 400, 
          headers: corsHeaders 
        });
      }
    } else {
      // Handle test webhooks or form-encoded data
      console.log('Received test webhook or form data');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Test webhook received successfully',
        data: requestText
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const order: WooCommerceOrder = requestBody;

    // Only process completed orders
    if (order.status !== 'completed' && order.status !== 'processing') {
      console.log(`Skipping order ${order.number} with status: ${order.status}`);
      return new Response('Order not in valid status', { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    // Find widgets that should receive this event
    const { data: widgets, error: widgetsError } = await supabase
      .from('widgets')
      .select('id, user_id, name')
      .eq('status', 'active');

    if (widgetsError) {
      console.error('Error fetching widgets:', widgetsError);
      return new Response('Database error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    if (!widgets || widgets.length === 0) {
      console.log('No active widgets found');
      return new Response('No active widgets', { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    // Create events for each widget
    const events = widgets.map(widget => ({
      widget_id: widget.id,
      event_type: 'purchase',
      event_data: {
        customer_name: `${order.billing?.first_name || ''} ${(order.billing?.last_name || '').charAt(0)}.`.trim(),
        product_name: order.line_items[0]?.name || 'Product',
        amount: `${order.currency} ${order.total}`,
        location: order.billing ? `${order.billing.city}, ${order.billing.country}` : 'Unknown',
        order_number: order.number,
        timestamp: order.date_created,
        platform: 'woocommerce',
        source_url: wcSource
      },
      views: 0,
      clicks: 0
    }));

    const { error: insertError } = await supabase
      .from('events')
      .insert(events);

    if (insertError) {
      console.error('Error inserting events:', insertError);
      return new Response('Failed to create events', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log(`Successfully created ${events.length} events for WooCommerce order ${order.number}`);

    return new Response(JSON.stringify({ 
      success: true, 
      eventsCreated: events.length,
      orderNumber: order.number
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing WooCommerce webhook:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});