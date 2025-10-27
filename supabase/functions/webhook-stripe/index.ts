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
    const body = JSON.parse(rawBody);
    const eventType = body.type;

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
