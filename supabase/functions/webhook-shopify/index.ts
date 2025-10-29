import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { checkRateLimit } from '../_shared/rate-limit.ts';

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
    const hmacHeader = req.headers.get('x-shopify-hmac-sha256');
    const topic = req.headers.get('x-shopify-topic');
    
    // Verify Shopify webhook signature - MANDATORY
    const secret = Deno.env.get('SHOPIFY_WEBHOOK_SECRET');
    if (!secret) {
      console.error('SHOPIFY_WEBHOOK_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!hmacHeader) {
      console.error('Missing HMAC signature header');
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify HMAC signature
    {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const messageData = encoder.encode(rawBody);
      
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
      const calculatedHmac = btoa(String.fromCharCode(...new Uint8Array(signature)));
      
      if (hmacHeader !== calculatedHmac) {
        console.error('Invalid Shopify webhook signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const body = JSON.parse(rawBody);
    
    // Apply rate limiting (1000 requests per hour per shop)
    const shopDomain = body.domain || body.shop_domain || 'unknown';
    const rateLimitKey = `shopify:${shopDomain}`;
    const rateLimit = await checkRateLimit(rateLimitKey, {
      max_requests: 1000,
      window_seconds: 3600 // 1 hour
    });

    if (!rateLimit.allowed) {
      console.log('Rate limit exceeded for shop', shopDomain);
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        retry_after: Math.ceil((rateLimit.reset - Date.now()) / 1000)
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '1000',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.reset.toString()
        }
      });
    }
    
    // Check for duplicate webhook using idempotency key
    const idempotencyKey = `shopify:${topic}:${body.id}`;

    const { data: existing } = await supabase
      .from('webhook_dedup')
      .select('id, processed_at')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existing) {
      console.log(`Duplicate webhook detected: ${idempotencyKey}, originally processed at ${existing.processed_at}`);
      
      await supabase.from('integration_logs').insert({
        integration_type: 'shopify',
        action: `webhook_${topic}_duplicate`,
        status: 'skipped',
        details: { 
          topic, 
          webhook_id: body.id,
          original_processed_at: existing.processed_at 
        },
      });
      
      return new Response(JSON.stringify({ success: true, duplicate: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store idempotency key BEFORE processing
    await supabase.from('webhook_dedup').insert({
      idempotency_key: idempotencyKey,
      webhook_type: 'shopify',
      payload: body
    });
    
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
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': rateLimit.remaining.toString()
      },
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
