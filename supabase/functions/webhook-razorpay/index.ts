import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
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

    const body = await req.json();
    const url = new URL(req.url);
    const websiteId = url.searchParams.get('website_id');

    if (!websiteId) {
      return new Response(JSON.stringify({ error: 'website_id parameter required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: widgets } = await supabase
      .from('widgets')
      .select('id, user_id')
      .eq('website_id', websiteId)
      .limit(1);

    if (!widgets || widgets.length === 0) {
      return new Response(JSON.stringify({ error: 'No widget found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const widget = widgets[0];
    const event = body.event;
    const payload = body.payload?.payment?.entity || body.payload?.subscription?.entity;

    let eventData: any = null;

    if (event === 'payment.authorized' || event === 'payment.captured') {
      const amount = (payload.amount / 100).toFixed(2);
      eventData = {
        widget_id: widget.id,
        event_type: 'purchase',
        user_email: payload.email,
        user_location: payload.card?.network || 'India',
        message_template: `Someone just made a payment of ₹${amount}`,
        event_data: {
          payment_id: payload.id,
          amount: amount,
          currency: payload.currency,
          method: payload.method,
        },
        source: 'integration',
        integration_type: 'razorpay',
        moderation_status: 'approved',
      };
    } else if (event === 'subscription.created' || event === 'subscription.activated') {
      eventData = {
        widget_id: widget.id,
        event_type: 'conversion',
        message_template: 'Someone just started a subscription',
        event_data: {
          subscription_id: payload.id,
          plan_id: payload.plan_id,
          status: payload.status,
        },
        source: 'integration',
        integration_type: 'razorpay',
        moderation_status: 'approved',
      };
    }

    if (eventData) {
      const { error: insertError } = await supabase.from('events').insert(eventData);
      
      if (insertError) {
        console.error('Error inserting event:', insertError);
        throw insertError;
      }

      await supabase.from('integration_logs').insert({
        integration_type: 'razorpay',
        action: event,
        status: 'success',
        user_id: widget.user_id,
        details: { event: event, payment_id: payload.id },
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Razorpay Webhook Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
