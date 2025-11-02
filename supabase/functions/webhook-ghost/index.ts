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

    // Get widget for this website and integration
    const { data: widgets } = await supabase
      .from('widgets')
      .select('id, user_id')
      .eq('website_id', websiteId)
      .limit(1);

    if (!widgets || widgets.length === 0) {
      return new Response(JSON.stringify({ error: 'No widget found for this website' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const widget = widgets[0];

    // Handle different Ghost webhook events
    let eventData: any = null;
    
    if (body.post) {
      // New post published
      eventData = {
        widget_id: widget.id,
        event_type: 'content_published',
        message_template: `New article published: "${body.post.current.title}"`,
        event_data: {
          title: body.post.current.title,
          author: body.post.current.primary_author?.name || 'Unknown',
          url: body.post.current.url,
        },
        source: 'integration',
        integration_type: 'ghost',
        moderation_status: 'approved',
      };
    } else if (body.member) {
      // New member signup or subscription
      eventData = {
        widget_id: widget.id,
        event_type: 'conversion',
        user_name: body.member.current.name || body.member.current.email,
        user_email: body.member.current.email,
        message_template: `${body.member.current.name || 'Someone'} just subscribed`,
        event_data: {
          email: body.member.current.email,
          status: body.member.current.status,
        },
        source: 'integration',
        integration_type: 'ghost',
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
        integration_type: 'ghost',
        action: 'webhook_received',
        status: 'success',
        user_id: widget.user_id,
        details: { event_type: eventData.event_type, website_id: websiteId },
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Ghost Webhook Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
