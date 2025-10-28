import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
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
    const stripeSignature = req.headers.get('stripe-signature');
    
    // Verify Stripe webhook signature - MANDATORY
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!stripeSignature) {
      console.error('Missing Stripe signature header');
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify signature
    {
      const signatureElements = stripeSignature.split(',');
      const timestamp = signatureElements.find(el => el.startsWith('t='))?.substring(2);
      const signature = signatureElements.find(el => el.startsWith('v1='))?.substring(3);
      
      if (!timestamp || !signature) {
        console.error('Invalid Stripe signature format');
        return new Response(JSON.stringify({ error: 'Invalid signature format' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const encoder = new TextEncoder();
      const payloadData = encoder.encode(`${timestamp}.${rawBody}`);
      const keyData = encoder.encode(webhookSecret);
      
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const expectedSignature = await crypto.subtle.sign('HMAC', cryptoKey, payloadData);
      const expectedHex = Array.from(new Uint8Array(expectedSignature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      if (signature !== expectedHex) {
        console.error('Invalid Stripe webhook signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Verify timestamp to prevent replay attacks (within 5 minutes)
      const currentTime = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
        return new Response(JSON.stringify({ error: 'Request timestamp too old' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const body = JSON.parse(rawBody);
    const eventType = body.type;

    // Check for duplicate webhook using Stripe event ID
    const idempotencyKey = `stripe:${body.id}`;

    const { data: existing } = await supabase
      .from('webhook_dedup')
      .select('id, processed_at')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existing) {
      console.log(`Duplicate Stripe webhook: ${body.id}`);
      
      await supabase.from('integration_logs').insert({
        integration_type: 'stripe',
        action: `webhook_${eventType}_duplicate`,
        status: 'skipped',
        details: { 
          event_id: body.id, 
          type: eventType,
          original_processed_at: existing.processed_at 
        },
      });
      
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store idempotency key
    await supabase.from('webhook_dedup').insert({
      idempotency_key: idempotencyKey,
      webhook_type: 'stripe',
      payload: body
    });

    await supabase.from('integration_logs').insert({
      integration_type: 'stripe',
      action: `webhook_${eventType}`,
      status: 'received',
      details: { event_id: body.id, type: eventType },
    });

    if (eventType === 'payment_intent.succeeded') {
      await handlePaymentSuccess(supabase, body.data.object);
    } else if (eventType === 'customer.subscription.created' || eventType === 'customer.subscription.updated') {
      await handleSubscriptionEvent(supabase, body.data.object);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Stripe Webhook Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handlePaymentSuccess(supabase: any, paymentIntent: any) {
  const eventData = {
    event_type: 'purchase',
    message_template: `Someone just made a purchase of $${(paymentIntent.amount / 100).toFixed(2)}`,
    event_data: {
      payment_id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
    },
    source: 'integration',
    integration_type: 'stripe',
    moderation_status: 'approved',
  };

  const { data: widgets } = await supabase
    .from('widgets')
    .select('id')
    .eq('integration', 'stripe')
    .limit(1);

  if (widgets && widgets.length > 0) {
    await supabase.from('events').insert({
      ...eventData,
      widget_id: widgets[0].id,
    });
  }
}

async function handleSubscriptionEvent(supabase: any, subscription: any) {
  console.log('Subscription event:', subscription.id, subscription.status);
}
