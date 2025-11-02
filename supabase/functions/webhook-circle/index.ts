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
    const data = body.data;

    let eventData: any = null;

    if (event === 'member.joined' || event === 'community_member_created') {
      eventData = {
        widget_id: widget.id,
        event_type: 'conversion',
        user_name: data.name || data.email?.split('@')[0],
        user_email: data.email,
        message_template: `${data.name || 'Someone'} just joined the community`,
        event_data: {
          member_id: data.id,
          community_id: data.community_id,
        },
        source: 'integration',
        integration_type: 'circle',
        moderation_status: 'approved',
      };
    } else if (event === 'post.created' || event === 'post_created') {
      eventData = {
        widget_id: widget.id,
        event_type: 'visitor',
        user_name: data.author?.name,
        message_template: `${data.author?.name || 'Someone'} posted in the community`,
        event_data: {
          post_id: data.id,
          post_title: data.name || data.body?.substring(0, 50),
        },
        source: 'integration',
        integration_type: 'circle',
        moderation_status: 'approved',
      };
    } else if (event === 'comment.created' || event === 'comment_created') {
      eventData = {
        widget_id: widget.id,
        event_type: 'visitor',
        user_name: data.author?.name,
        message_template: `${data.author?.name || 'Someone'} commented on a post`,
        event_data: {
          comment_id: data.id,
          post_id: data.post_id,
        },
        source: 'integration',
        integration_type: 'circle',
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
        integration_type: 'circle',
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
    console.error('Circle Webhook Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
