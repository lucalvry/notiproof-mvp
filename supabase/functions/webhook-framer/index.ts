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

    // Framer form submissions
    const formData = body.data || body;
    const submitterName = formData.name || formData.email?.split('@')[0] || 'Someone';

    const eventData = {
      widget_id: widget.id,
      event_type: 'conversion',
      user_name: formData.name,
      user_email: formData.email,
      message_template: `${submitterName} just submitted a form`,
      event_data: {
        form_id: body.form_id || 'contact',
        submission_data: formData,
        submitted_at: new Date().toISOString(),
      },
      source: 'integration',
      integration_type: 'framer',
      moderation_status: 'approved',
    };

    const { error: insertError } = await supabase.from('events').insert(eventData);
    
    if (insertError) {
      console.error('Error inserting event:', insertError);
      throw insertError;
    }

    await supabase.from('integration_logs').insert({
      integration_type: 'framer',
      action: 'form_submission',
      status: 'success',
      user_id: widget.user_id,
      details: { form_id: body.form_id },
    });

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Framer Webhook Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
