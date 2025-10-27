import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-topic',
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

    const rawBody = await req.text();
    const topic = req.headers.get('x-shopify-topic');
    const body = JSON.parse(rawBody);
    
    await supabase.from('integration_logs').insert({
      integration_type: 'shopify',
      action: `webhook_${topic}`,
      status: 'received',
      details: { topic, webhook_id: body.id },
    });

    if (topic === 'orders/create' || topic === 'orders/updated') {
      await handleOrderEvent(supabase, body);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Shopify Webhook Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleOrderEvent(supabase: any, order: any) {
  const eventData = {
    event_type: 'purchase',
    message_template: `${order.customer?.first_name || 'Someone'} from ${order.shipping_address?.city || 'Unknown'} just purchased ${order.line_items?.[0]?.title || 'a product'}`,
    user_name: order.customer?.first_name,
    user_location: order.shipping_address?.city,
    event_data: {
      order_id: order.id,
      total: order.total_price,
      currency: order.currency,
    },
    source: 'integration',
    integration_type: 'shopify',
    moderation_status: 'approved',
  };

  const { data: widgets } = await supabase
    .from('widgets')
    .select('id')
    .eq('integration', 'shopify')
    .limit(1);

  if (widgets && widgets.length > 0) {
    await supabase.from('events').insert({
      ...eventData,
      widget_id: widgets[0].id,
    });
  }
}
