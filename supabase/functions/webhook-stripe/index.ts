import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { checkRateLimit } from '../_shared/rate-limit.ts';

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

    // Apply rate limiting (1000 requests per hour per account)
    const accountId = body.account || body.data?.object?.customer || 'default';
    const rateLimitKey = `stripe:${accountId}`;
    const rateLimit = await checkRateLimit(rateLimitKey, {
      max_requests: 1000,
      window_seconds: 3600 // 1 hour
    });

    if (!rateLimit.allowed) {
      console.log('Rate limit exceeded for account', accountId);
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

    // Handle different webhook events
    if (eventType === 'checkout.session.completed') {
      await handleCheckoutCompleted(supabase, body.data.object);
    } else if (eventType === 'customer.subscription.created' || eventType === 'customer.subscription.updated') {
      await handleSubscriptionUpdate(supabase, body.data.object);
    } else if (eventType === 'customer.subscription.deleted') {
      await handleSubscriptionDeleted(supabase, body.data.object);
    } else if (eventType === 'invoice.payment_failed') {
      await handlePaymentFailed(supabase, body.data.object);
    } else if (eventType === 'payment_intent.succeeded') {
      await handlePaymentSuccess(supabase, body.data.object);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': rateLimit.remaining.toString()
      },
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

async function handleCheckoutCompleted(supabase: any, session: any) {
  console.log('Checkout completed:', session.id);
  
  const userId = session.metadata?.user_id;
  const stripeCustomerId = session.customer;
  const stripeSubscriptionId = session.subscription;
  
  if (!userId) {
    console.error('No user_id in checkout session metadata');
    return;
  }

  // Get subscription details from Stripe
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const subResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${stripeSubscriptionId}`, {
    headers: { 'Authorization': `Bearer ${stripeSecretKey}` },
  });
  
  if (!subResponse.ok) {
    console.error('Failed to fetch subscription from Stripe');
    return;
  }
  
  const subscription = await subResponse.json();
  const priceId = subscription.items.data[0]?.price?.id;
  
  if (!priceId) {
    console.error('No price ID found in subscription');
    return;
  }

  // Find the plan by Stripe price ID
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('id, name')
    .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
    .single();
  
  if (!plans) {
    console.error('No matching plan found for price ID:', priceId);
    return;
  }

  // Create or update user subscription
  const { error } = await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      plan_id: plans.id,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('Error upserting subscription:', error);
    return;
  }

  await supabase.from('integration_logs').insert({
    integration_type: 'stripe',
    action: 'checkout_completed',
    status: 'success',
    details: { 
      session_id: session.id,
      subscription_id: stripeSubscriptionId,
      plan_name: plans.name,
      user_id: userId,
    },
  });

  console.log('Subscription created/updated successfully for user:', userId);
}

async function handleSubscriptionUpdate(supabase: any, subscription: any) {
  console.log('Subscription updated:', subscription.id, subscription.status);
  
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription:', error);
  }
}

async function handleSubscriptionDeleted(supabase: any, subscription: any) {
  console.log('Subscription deleted:', subscription.id);
  
  const { error } = await supabase
    .from('user_subscriptions')
    .update({ status: 'cancelled' })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription to cancelled:', error);
  }
}

async function handlePaymentFailed(supabase: any, invoice: any) {
  console.log('Payment failed for subscription:', invoice.subscription);
  
  if (!invoice.subscription) return;
  
  const { error } = await supabase
    .from('user_subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', invoice.subscription);

  if (error) {
    console.error('Error updating subscription to past_due:', error);
  }
}
