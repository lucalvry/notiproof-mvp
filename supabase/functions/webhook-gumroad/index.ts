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

    // Gumroad sends sale data
    const eventData = {
      widget_id: widget.id,
      event_type: 'purchase',
      user_name: body.purchaser_name || body.email?.split('@')[0],
      user_email: body.email,
      user_location: body.ip_country,
      message_template: `${body.purchaser_name || 'Someone'} just purchased ${body.product_name}`,
      event_data: {
        product_name: body.product_name,
        price: body.price,
        currency: body.currency || 'USD',
        sale_id: body.sale_id,
      },
      source: 'integration',
      integration_type: 'gumroad',
      moderation_status: 'approved',
    };

    const { error: insertError } = await supabase.from('events').insert(eventData);
    
    if (insertError) {
      console.error('Error inserting event:', insertError);
      throw insertError;
    }

    await supabase.from('integration_logs').insert({
      integration_type: 'gumroad',
      action: 'sale_webhook',
      status: 'success',
      user_id: widget.user_id,
      details: { sale_id: body.sale_id, product: body.product_name },
    });

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Gumroad Webhook Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
