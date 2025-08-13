import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-topic, x-shopify-shop-domain',
};

interface ShopifyOrder {
  id: number;
  order_number: string;
  customer: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  total_price: string;
  currency: string;
  line_items: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
  created_at: string;
  billing_address?: {
    city: string;
    country: string;
  };
}

serve(async (req) => {
  console.log(`Shopify webhook received: ${req.method} ${req.url}`);
  
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
    const shopifyTopic = req.headers.get('x-shopify-topic');
    const shopifyShop = req.headers.get('x-shopify-shop-domain');
    const shopifyHmac = req.headers.get('x-shopify-hmac-sha256');

    console.log(`Shopify webhook - Topic: ${shopifyTopic}, Shop: ${shopifyShop}`);

    if (!shopifyTopic) {
      return new Response('Missing Shopify topic header', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const order: ShopifyOrder = await req.json();
    console.log(`Processing order ${order.order_number} for ${order.customer?.email}`);

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
        customer_name: `${order.customer?.first_name || ''} ${(order.customer?.last_name || '').charAt(0)}.`.trim(),
        product_name: order.line_items[0]?.name || 'Product',
        amount: `${order.currency} ${order.total_price}`,
        location: order.billing_address ? `${order.billing_address.city}, ${order.billing_address.country}` : 'Unknown',
        order_number: order.order_number,
        timestamp: order.created_at,
        platform: 'shopify',
        shop_domain: shopifyShop
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

    console.log(`Successfully created ${events.length} events for order ${order.order_number}`);

    return new Response(JSON.stringify({ 
      success: true, 
      eventsCreated: events.length,
      orderNumber: order.order_number
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing Shopify webhook:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});