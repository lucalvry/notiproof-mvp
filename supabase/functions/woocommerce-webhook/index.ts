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

    // Get headers for verification and logging
    const wcTopic = req.headers.get('x-wc-webhook-topic');
    const wcSource = req.headers.get('x-wc-webhook-source');
    const wcSignature = req.headers.get('x-wc-webhook-signature');
    const contentType = req.headers.get('content-type') || '';

    console.log(`WooCommerce webhook - Topic: ${wcTopic}, Source: ${wcSource}, Content-Type: ${contentType}, Has Signature: ${!!wcSignature}`);

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
        return new Response(JSON.stringify({ 
          error: 'Invalid JSON format',
          details: error.message,
          received: requestText.substring(0, 200)
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else {
      // Handle test webhooks or non-JSON data
      console.log('Received test webhook or non-JSON data');
      
      // Check if it's likely a test request (has typical WooCommerce headers)
      if (wcTopic || wcSource) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'WooCommerce webhook endpoint is working',
          test: true,
          headers: {
            topic: wcTopic,
            source: wcSource,
            hasSignature: !!wcSignature
          },
          instructions: {
            message: 'Configure your WooCommerce webhook with JSON format and "Order completed" topic',
            expectedFormat: 'application/json'
          }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Webhook endpoint is active but received non-JSON data',
        contentType: contentType,
        dataReceived: requestText.substring(0, 100)
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const order: WooCommerceOrder = requestBody;

    // Only process completed and processing orders
    if (order.status !== 'completed' && order.status !== 'processing') {
      console.log(`Skipping order ${order.number} with status: ${order.status}`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Order ${order.number} status (${order.status}) not processed`,
        note: 'Only "completed" and "processing" orders create notifications',
        orderStatus: order.status
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find widgets that should receive this event
    const { data: widgets, error: widgetsError } = await supabase
      .from('widgets')
      .select('id, user_id, name')
      .eq('status', 'active');

    if (widgetsError) {
      console.error('Error fetching widgets:', widgetsError);
      return new Response(JSON.stringify({ 
        error: 'Database error while fetching widgets',
        details: widgetsError.message
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!widgets || widgets.length === 0) {
      console.log('No active widgets found');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No active widgets found to process this order',
        note: 'Create and activate a widget to receive WooCommerce notifications',
        orderProcessed: order.number
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create events for each widget with proper business context
    const customerName = `${order.billing?.first_name || ''} ${(order.billing?.last_name || '').charAt(0)}.`.trim();
    const location = order.billing ? `${order.billing.city}, ${order.billing.country}` : 'Unknown';
    const productName = order.line_items[0]?.name || 'Product';
    const amount = parseFloat(order.total);
    const currency = order.currency;
    
    // Generate dynamic message using the same format as MessageGenerationService
    const messageTemplate = `${customerName} from ${location} just bought ${productName} for ${currency} ${order.total}`;
    
    const events = widgets.map(widget => ({
      widget_id: widget.id,
      event_type: 'purchase',
      business_type: 'ecommerce',
      user_name: customerName,
      user_location: location,
      message_template: messageTemplate,
      business_context: {
        industry: 'ecommerce',
        platform: 'woocommerce',
        customer_type: 'returning_customer'
      },
      context_template: 'ecommerce_purchase',
      event_data: {
        customer_name: customerName,
        product_name: productName,
        amount: `${currency} ${order.total}`,
        location: location,
        order_number: order.number,
        timestamp: order.date_created,
        platform: 'woocommerce',
        source_url: wcSource,
        currency: currency,
        price: amount,
        quantity: order.line_items.reduce((sum, item) => sum + item.quantity, 0)
      },
      source: 'woocommerce',
      views: 0,
      clicks: 0
    }));

    const { error: insertError } = await supabase
      .from('events')
      .insert(events);

    if (insertError) {
      console.error('Error inserting events:', insertError);
      return new Response(JSON.stringify({ 
        error: 'Failed to create notification events',
        details: insertError.message,
        order: order.number
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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