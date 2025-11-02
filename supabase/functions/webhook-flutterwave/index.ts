import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, verif-hash',
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
    const data = body.data;

    let eventData: any = null;

    if (event === 'charge.completed') {
      eventData = {
        widget_id: widget.id,
        event_type: 'purchase',
        user_name: data.customer?.name,
        user_email: data.customer?.email,
        user_location: data.customer?.country || 'Africa',
        message_template: `${data.customer?.name || 'Someone'} just made a payment of ${data.currency}${data.amount}`,
        event_data: {
          transaction_id: data.id,
          amount: data.amount,
          currency: data.currency,
          payment_type: data.payment_type,
        },
        source: 'integration',
        integration_type: 'flutterwave',
        moderation_status: 'approved',
      };
    } else if (event === 'transfer.completed') {
      eventData = {
        widget_id: widget.id,
        event_type: 'visitor',
        message_template: 'Transfer completed successfully',
        event_data: {
          transfer_id: data.id,
          amount: data.amount,
          currency: data.currency,
        },
        source: 'integration',
        integration_type: 'flutterwave',
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
        integration_type: 'flutterwave',
        action: event,
        status: 'success',
        user_id: widget.user_id,
        details: { event: event, transaction_id: data.id },
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Flutterwave Webhook Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
