import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const subscriber = body.subscriber;

    let eventData: any = null;

    if (event === 'subscriber.subscriber_activate') {
      eventData = {
        widget_id: widget.id,
        event_type: 'conversion',
        user_name: subscriber?.first_name || subscriber?.email?.split('@')[0],
        user_email: subscriber?.email_address,
        message_template: `${subscriber?.first_name || 'Someone'} just subscribed`,
        event_data: {
          subscriber_id: subscriber?.id,
          email: subscriber?.email_address,
          form_id: subscriber?.form_id,
        },
        source: 'integration',
        integration_type: 'convertkit',
        moderation_status: 'approved',
      };
    } else if (event === 'subscriber.subscriber_unsubscribe') {
      eventData = {
        widget_id: widget.id,
        event_type: 'visitor',
        message_template: 'Someone unsubscribed',
        event_data: {
          subscriber_id: subscriber?.id,
          email: subscriber?.email_address,
        },
        source: 'integration',
        integration_type: 'convertkit',
        moderation_status: 'approved',
      };
    } else if (event === 'purchase.purchase_create') {
      const purchase = body.purchase;
      eventData = {
        widget_id: widget.id,
        event_type: 'purchase',
        user_email: purchase?.subscriber?.email_address,
        message_template: `Someone just purchased ${purchase?.product_name}`,
        event_data: {
          purchase_id: purchase?.id,
          product_name: purchase?.product_name,
          total: purchase?.total_cents / 100,
          currency: purchase?.currency,
        },
        source: 'integration',
        integration_type: 'convertkit',
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
        integration_type: 'convertkit',
        action: event,
        status: 'success',
        user_id: widget.user_id,
        details: { event: event },
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('ConvertKit Webhook Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
