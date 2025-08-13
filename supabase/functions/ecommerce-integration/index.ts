import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShopifyOrder {
  id: number;
  email: string;
  created_at: string;
  total_price: string;
  currency: string;
  line_items: Array<{
    title: string;
    quantity: number;
    price: string;
  }>;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
  };
  shipping_address?: {
    city: string;
    province: string;
    country: string;
  };
}

interface WooCommerceOrder {
  id: number;
  status: string;
  currency: string;
  date_created: string;
  total: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    city: string;
    state: string;
    country: string;
  };
  line_items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  try {
    const { action, data, widgetId, integration } = await req.json();
    console.log('E-commerce integration request:', { action, integration, widgetId });

    switch (action) {
      case 'shopify_order_webhook':
        return await handleShopifyOrder(supabase, data, widgetId);
      
      case 'woocommerce_order_webhook':
        return await handleWooCommerceOrder(supabase, data, widgetId);
      
      case 'setup_shopify_integration':
        return await setupShopifyIntegration(supabase, data);
        
      case 'setup_woocommerce_integration':
        return await setupWooCommerceIntegration(supabase, data);
        
      case 'test_integration':
        return await testIntegration(supabase, data);
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error in e-commerce integration:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleShopifyOrder(supabase: any, order: ShopifyOrder, widgetId: string) {
  console.log('Processing Shopify order:', order.id);
  
  // Create event data
  const eventData = {
    customer_name: `${order.customer?.first_name} ${order.customer?.last_name}`.trim() || 'Anonymous',
    location: order.shipping_address ? 
      `${order.shipping_address.city}, ${order.shipping_address.province || order.shipping_address.country}` : 
      'Unknown',
    amount: parseFloat(order.total_price),
    currency: order.currency,
    product_name: order.line_items[0]?.title || 'Product',
    order_id: order.id,
    timestamp: order.created_at,
    source: 'shopify',
    items_count: order.line_items.length
  };

  // Insert event into database
  const { error } = await supabase
    .from('events')
    .insert({
      widget_id: widgetId,
      event_type: 'purchase',
      event_data: eventData,
      views: 0,
      clicks: 0
    });

  if (error) throw error;

  console.log('Shopify order event created successfully');
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleWooCommerceOrder(supabase: any, order: WooCommerceOrder, widgetId: string) {
  console.log('Processing WooCommerce order:', order.id);
  
  const eventData = {
    customer_name: `${order.billing?.first_name} ${order.billing?.last_name}`.trim() || 'Anonymous',
    location: order.billing ? 
      `${order.billing.city}, ${order.billing.state || order.billing.country}` : 
      'Unknown',
    amount: parseFloat(order.total),
    currency: order.currency,
    product_name: order.line_items[0]?.name || 'Product',
    order_id: order.id,
    timestamp: order.date_created,
    source: 'woocommerce',
    status: order.status,
    items_count: order.line_items.length
  };

  const { error } = await supabase
    .from('events')
    .insert({
      widget_id: widgetId,
      event_type: 'purchase',
      event_data: eventData,
      views: 0,
      clicks: 0
    });

  if (error) throw error;

  console.log('WooCommerce order event created successfully');
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function setupShopifyIntegration(supabase: any, config: any) {
  console.log('Setting up Shopify integration');
  
  const { user_id, shop_domain, access_token, widget_id } = config;
  
  // Store integration configuration
  const { error } = await supabase
    .from('integration_hooks')
    .insert({
      user_id,
      type: 'shopify',
      url: `https://${shop_domain}`,
      config: {
        shop_domain,
        access_token,
        widget_id,
        webhook_topics: ['orders/create', 'orders/updated']
      }
    });

  if (error) throw error;

  return new Response(JSON.stringify({ 
    success: true,
    webhook_url: `https://ewymvxhpkswhsirdrjub.functions.supabase.co/ecommerce-integration`,
    instructions: 'Add this webhook URL to your Shopify admin under Settings > Notifications'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function setupWooCommerceIntegration(supabase: any, config: any) {
  console.log('Setting up WooCommerce integration');
  
  const { user_id, site_url, consumer_key, consumer_secret, widget_id } = config;
  
  const { error } = await supabase
    .from('integration_hooks')
    .insert({
      user_id,
      type: 'woocommerce',
      url: site_url,
      config: {
        site_url,
        consumer_key,
        consumer_secret,
        widget_id,
        webhook_events: ['order.created', 'order.updated']
      }
    });

  if (error) throw error;

  return new Response(JSON.stringify({ 
    success: true,
    webhook_url: `https://ewymvxhpkswhsirdrjub.functions.supabase.co/ecommerce-integration`,
    instructions: 'Install the NotiProof WooCommerce plugin or manually add webhook'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function testIntegration(supabase: any, config: any) {
  console.log('Testing integration:', config);
  
  const { integration_type, widget_id } = config;
  
  // Create test event
  const testEventData = {
    customer_name: 'John D.',
    location: 'New York, NY',
    amount: 49.99,
    currency: 'USD',
    product_name: 'Test Product',
    timestamp: new Date().toISOString(),
    source: integration_type,
    test: true
  };

  const { error } = await supabase
    .from('events')
    .insert({
      widget_id,
      event_type: 'purchase',
      event_data: testEventData,
      views: 0,
      clicks: 0
    });

  if (error) throw error;

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}